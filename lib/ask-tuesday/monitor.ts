import type { Collection } from "mongodb";
import { TUESDAY_MONITOR } from "../../config/tuesday-monitor";
import type { TuesdayScanResponse } from "./types";

const EMPTY_COUNT = 0;
const DISABLED_VALUES = new Set(["false", "0", "off", "no"]);
const BUILD_PHASE = "phase-production-build";

export type TuesdayMonitorScan = Pick<TuesdayScanResponse, "mode" | "checkedAt" | "status" | "totalIssues"> & {
  orderIssueCount: number;
  customerChatCount: number;
};

export type TuesdayMonitorDocument = {
  _id: string;
  leaseToken?: string;
  leaseUntil?: number;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  status?: "running" | "checked" | "partial" | "failed";
  error?: string | null;
  summaryCounts?: {generated: number; failed: number};
  scan?: TuesdayMonitorScan;
};

export function shouldStartTuesdayMonitor(environment: Record<string, string | undefined>): boolean {
  return environment.NODE_ENV === "production" && environment.NEXT_RUNTIME === "nodejs"
    && !DISABLED_VALUES.has(environment.ASK_TUESDAY_MONITOR_ENABLED?.trim().toLowerCase() ?? "")
    && environment.NEXT_PHASE !== BUILD_PHASE && !environment.NEXT_PRIVATE_BUILD_WORKER
    && !environment.VERCEL && !environment.NETLIFY && !environment.AWS_LAMBDA_FUNCTION_NAME
    && !environment.FUNCTION_TARGET && !environment.K_SERVICE;
}

type RunDependencies = {
  collection: Collection<TuesdayMonitorDocument>;
  now: () => string;
  makeToken: () => string;
  work: () => Promise<{scan: TuesdayScanResponse; generated: number; failed: number}>;
};
export type TuesdayMonitorRunResult = "saved" | "skipped" | "lost-lease" | "failed";

export async function runTuesdayMonitor(dependencies: RunDependencies): Promise<TuesdayMonitorRunResult> {
  const {collection} = dependencies;
  const startedAt = dependencies.now();
  const timestamp = Date.parse(startedAt);
  if (!Number.isFinite(timestamp)) throw new Error(TUESDAY_MONITOR.failureMessage);
  const leaseToken = dependencies.makeToken();
  const owned = (now: string) => ({_id: TUESDAY_MONITOR.documentId, leaseToken, leaseUntil: {$gt: Date.parse(now)}});
  try {
    const lease = await collection.findOneAndUpdate({
      _id: TUESDAY_MONITOR.documentId,
      $or: [{leaseUntil: {$exists: false}}, {leaseUntil: {$lte: timestamp}}],
    }, {$set: {leaseToken, leaseUntil: timestamp + TUESDAY_MONITOR.leaseDurationMs,
      lastAttemptAt: startedAt, status: "running"}}, {upsert: true, returnDocument: "after"});
    if (lease?.leaseToken !== leaseToken) return "skipped";
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === TUESDAY_MONITOR.duplicateKeyError) return "skipped";
    throw new Error(TUESDAY_MONITOR.failureMessage);
  }

  try {
    const {scan: employeeScan, generated, failed} = await dependencies.work();
    // Employee responses can contain many large saved fields. Persist counts
    // only; the employee API always loads current order and message details.
    const scan: TuesdayMonitorScan = {
      mode: employeeScan.mode, checkedAt: employeeScan.checkedAt, status: employeeScan.status,
      totalIssues: employeeScan.totalIssues, orderIssueCount: employeeScan.orderIssues?.length ?? EMPTY_COUNT,
      customerChatCount: employeeScan.customerChats?.length ?? EMPTY_COUNT,
    };
    const finishedAt = dependencies.now();
    const summariesFailed = failed > EMPTY_COUNT;
    const saved = await collection.updateOne(owned(finishedAt), {$set: {
      scan, lastSuccessAt: finishedAt, summaryCounts: {generated, failed},
      status: summariesFailed || scan.status !== "checked" ? "partial" : "checked",
      error: summariesFailed ? TUESDAY_MONITOR.summaryFailureMessage : null,
      ...(summariesFailed ? {lastFailureAt: finishedAt} : {}),
    }});
    return saved.matchedCount > EMPTY_COUNT ? "saved" : "lost-lease";
  } catch {
    const finishedAt = dependencies.now();
    try {
      const saved = await collection.updateOne(owned(finishedAt), {$set: {
        status: "failed", lastFailureAt: finishedAt, error: TUESDAY_MONITOR.failureMessage,
      }});
      return saved.matchedCount > EMPTY_COUNT ? "failed" : "lost-lease";
    } catch {
      throw new Error(TUESDAY_MONITOR.failureMessage);
    }
  } finally {
    try {
      await collection.updateOne({_id: TUESDAY_MONITOR.documentId, leaseToken}, {$unset: {leaseToken: "", leaseUntil: ""}});
    } catch { /* The expiry permits recovery when a shutdown or connection failure prevents release. */ }
  }
}

type MonitorLoop = {stop: () => void};
type MonitorGlobal = typeof globalThis & {__tuesdayMonitorLoop?: MonitorLoop};
type LoopDependencies = {tick: () => Promise<unknown>; reportFailure?: () => void};

export function startTuesdayMonitor(dependencies: LoopDependencies): MonitorLoop {
  const state = globalThis as MonitorGlobal;
  if (state.__tuesdayMonitorLoop) return state.__tuesdayMonitorLoop;
  let busy = false;
  let stopped = false;
  const tick = async () => {
    if (busy || stopped) return;
    busy = true;
    try {await dependencies.tick();}
    catch {dependencies.reportFailure?.();}
    finally {busy = false;}
  };
  const interval = setInterval(() => {void tick();}, TUESDAY_MONITOR.intervalMs);
  interval.unref?.();
  const loop: MonitorLoop = {stop: () => {
    stopped = true;
    clearInterval(interval);
    if (state.__tuesdayMonitorLoop === loop) delete state.__tuesdayMonitorLoop;
  }};
  state.__tuesdayMonitorLoop = loop;
  void tick();
  return loop;
}
