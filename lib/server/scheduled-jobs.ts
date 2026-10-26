import type { Collection } from "mongodb";
import { SCHEDULED_JOBS, type ScheduledJobId } from "../../config/scheduled-jobs";
import { shouldStartTuesdayMonitor } from "../ask-tuesday/monitor";

// Pure scheduling core (no Node-only imports: instrumentation.ts loads it in
// every runtime). Server wiring lives in ./scheduled-jobs-runner.ts.
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const EMPTY_COUNT = 0;

export type ScheduledJob = {id: ScheduledJobId; run: (context: {catchUp: boolean}) => Promise<unknown>};
export type ScheduledJobDocument = {
  _id: string;
  leaseToken?: string;
  leaseUntil?: number;
  retryAt?: number;
  lastRunDate?: string;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  status?: "running" | "succeeded" | "failed";
  error?: string | null;
};
export type ScheduledJobResult = "succeeded" | "already-done" | "busy" | "failed" | "lost-lease";
type JobCollection = Pick<Collection<ScheduledJobDocument>, "findOne" | "findOneAndUpdate" | "updateOne">;

/** Same production/runtime/build gating as the Ask Tuesday monitor, with its own opt-out flag. */
export function shouldStartScheduledJobs(environment: Record<string, string | undefined>): boolean {
  return shouldStartTuesdayMonitor({...environment, ASK_TUESDAY_MONITOR_ENABLED: environment[SCHEDULED_JOBS.enabledEnv]});
}

const clockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SCHEDULED_JOBS.timeZone, hourCycle: "h23",
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
});

/** Wall-clock date (YYYY-MM-DD) and minute of day in the job time zone; Intl applies that instant's DST offset. */
export function localClock(now: Date): {date: string; minuteOfDay: number} {
  const parts = Object.fromEntries(clockFormatter.formatToParts(now).map(part => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minuteOfDay: (Number(parts.hour) % HOURS_PER_DAY) * MINUTES_PER_HOUR + Number(parts.minute),
  };
}

const scheduledMinute = (id: ScheduledJobId) =>
  SCHEDULED_JOBS.times[id].hour * MINUTES_PER_HOUR + SCHEDULED_JOBS.times[id].minute;

/** Due from its local time until midnight; a process that starts later the same day catches up. */
export function isScheduledJobDue(id: ScheduledJobId, now: Date): boolean {
  return localClock(now).minuteOfDay >= scheduledMinute(id);
}

const isDuplicateKey = (error: unknown) => !!error && typeof error === "object" && "code" in error
  && error.code === SCHEDULED_JOBS.duplicateKeyError;

type RunDependencies = {
  collection: JobCollection;
  job: ScheduledJob;
  now: () => Date;
  makeToken: () => string;
  reportError?: (id: ScheduledJobId, error: unknown) => void;
};

/**
 * Runs `job` at most once per local day across processes: a lease document
 * (`_id` = job id) is claimed before the work and records `lastRunDate` after
 * it. A failure releases the lease and waits `retryDelayMs` before retrying.
 */
export async function runScheduledJob({collection, job, now, makeToken, reportError}: RunDependencies): Promise<ScheduledJobResult> {
  const startedAt = now();
  const timestamp = startedAt.getTime();
  const {date, minuteOfDay} = localClock(startedAt);
  const current = await collection.findOne({_id: job.id}, {projection: {lastRunDate: 1}});
  if (current?.lastRunDate === date) return "already-done";

  const leaseToken = makeToken();
  try {
    const lease = await collection.findOneAndUpdate({
      _id: job.id, lastRunDate: {$ne: date},
      $and: [
        {$or: [{leaseUntil: {$exists: false}}, {leaseUntil: {$lte: timestamp}}]},
        {$or: [{retryAt: {$exists: false}}, {retryAt: {$lte: timestamp}}]},
      ],
    }, {$set: {leaseToken, leaseUntil: timestamp + SCHEDULED_JOBS.leaseDurationMs,
      lastAttemptAt: startedAt.toISOString(), status: "running"}}, {upsert: true, returnDocument: "after"});
    if (lease?.leaseToken !== leaseToken) return "busy";
  } catch (error) {
    // The unique _id rejects the upsert while another process holds the lease,
    // the job waits to retry, or it already ran today.
    if (isDuplicateKey(error)) return "busy";
    throw error;
  }

  const owned = {_id: job.id, leaseToken};
  try {
    await job.run({catchUp: minuteOfDay > scheduledMinute(job.id) + SCHEDULED_JOBS.onTimeWindowMinutes});
    const saved = await collection.updateOne(owned, {
      $set: {lastRunDate: date, lastSuccessAt: now().toISOString(), status: "succeeded", error: null},
      $unset: {leaseToken: "", leaseUntil: "", retryAt: ""},
    });
    return saved.matchedCount > EMPTY_COUNT ? "succeeded" : "lost-lease";
  } catch (error) {
    reportError?.(job.id, error);
    const failedAt = now();
    const saved = await collection.updateOne(owned, {
      $set: {status: "failed", lastFailureAt: failedAt.toISOString(),
        retryAt: failedAt.getTime() + SCHEDULED_JOBS.retryDelayMs, error: SCHEDULED_JOBS.failureMessage},
      $unset: {leaseToken: "", leaseUntil: ""},
    });
    return saved.matchedCount > EMPTY_COUNT ? "failed" : "lost-lease";
  }
}

type SchedulerLoop = {stop: () => void};
type SchedulerGlobal = typeof globalThis & {__scheduledJobsLoop?: SchedulerLoop};
type LoopDependencies = {
  jobs: readonly ScheduledJob[];
  runJob: (job: ScheduledJob) => Promise<ScheduledJobResult>;
  now?: () => Date;
  reportFailure?: (id: ScheduledJobId, error: unknown) => void;
};

/** One loop per process. Checks every `checkIntervalMs` and once at startup (catch-up). */
export function startScheduledJobs({jobs, runJob, now = () => new Date(), reportFailure}: LoopDependencies): SchedulerLoop {
  const state = globalThis as SchedulerGlobal;
  if (state.__scheduledJobsLoop) return state.__scheduledJobsLoop;
  // Local dates already finished, so finished jobs skip the database until tomorrow.
  const finishedOn = new Map<ScheduledJobId, string>();
  let busy = false;
  let stopped = false;
  const tick = async () => {
    if (busy || stopped) return;
    busy = true;
    try {
      for (const job of jobs) {
        const checkedAt = now();
        const {date} = localClock(checkedAt);
        if (stopped || finishedOn.get(job.id) === date || !isScheduledJobDue(job.id, checkedAt)) continue;
        try {
          const result = await runJob(job);
          if (result === "succeeded" || result === "already-done") finishedOn.set(job.id, date);
        } catch (error) {
          reportFailure?.(job.id, error);
        }
      }
    } finally {
      busy = false;
    }
  };
  const interval = setInterval(() => {void tick();}, SCHEDULED_JOBS.checkIntervalMs);
  interval.unref?.();
  const loop: SchedulerLoop = {stop: () => {
    stopped = true;
    clearInterval(interval);
    if (state.__scheduledJobsLoop === loop) delete state.__scheduledJobsLoop;
  }};
  state.__scheduledJobsLoop = loop;
  void tick();
  return loop;
}
