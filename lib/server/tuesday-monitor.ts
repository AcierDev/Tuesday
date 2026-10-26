import { randomUUID } from "node:crypto";
import { TUESDAY_MONITOR } from "../../config/tuesday-monitor";
import { describeMonitorError, runTuesdayMonitor, shouldStartTuesdayMonitor, startTuesdayMonitor, tuesdayMonitorHealth, type TuesdayMonitorDocument } from "../ask-tuesday/monitor";
import { readTuesdaySnapshot } from "../ask-tuesday/server";
import { scanTuesdaySnapshot } from "../ask-tuesday/scan";
import type { TuesdayMonitorHealth } from "../ask-tuesday/types";
import { summarizeTuesdaySnapshot } from "./tuesday-summaries";

const reportMonitorError = (error: unknown) => console.error(`${TUESDAY_MONITOR.failureMessage} ${describeMonitorError(error)}`);

export async function runServerTuesdayMonitor() {
  const mode = process.env.NEXT_PUBLIC_MODE;
  if (!mode) throw new Error(TUESDAY_MONITOR.failureMessage);
  const {getDb} = await import("../../app/api/db/connect");
  const db = await getDb();
  return runTuesdayMonitor({
    collection: db.collection<TuesdayMonitorDocument>(`${TUESDAY_MONITOR.collection}-${mode}`),
    now: () => new Date().toISOString(), makeToken: randomUUID, reportError: reportMonitorError,
    work: async () => {
      const snapshot = await readTuesdaySnapshot(TUESDAY_MONITOR.request);
      if (!snapshot.ordersCheckedAt) throw new Error(TUESDAY_MONITOR.failureMessage);
      const now = new Date().toISOString();
      const summaries = await summarizeTuesdaySnapshot(snapshot, db, now);
      return {scan: scanTuesdaySnapshot(snapshot, new Date().toISOString()), ...summaries};
    },
  });
}

/** Last successful background run, for processes that are expected to run the monitor. */
export async function readServerTuesdayMonitorHealth(): Promise<TuesdayMonitorHealth | undefined> {
  const mode = process.env.NEXT_PUBLIC_MODE;
  if (!mode || !shouldStartTuesdayMonitor({...process.env, NEXT_RUNTIME: process.env.NEXT_RUNTIME})) return undefined;
  const {getDb} = await import("../../app/api/db/connect");
  const document = await (await getDb()).collection<TuesdayMonitorDocument>(`${TUESDAY_MONITOR.collection}-${mode}`)
    .findOne({_id: TUESDAY_MONITOR.documentId}, {projection: {lastSuccessAt: 1}});
  return tuesdayMonitorHealth(document, new Date().toISOString());
}

export function startServerTuesdayMonitor() {
  const loop = startTuesdayMonitor({tick: runServerTuesdayMonitor, reportFailure: reportMonitorError});
  process.once("SIGTERM", loop.stop);
  process.once("SIGINT", loop.stop);
}
