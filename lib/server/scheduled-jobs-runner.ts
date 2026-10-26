import { randomUUID } from "node:crypto";
import { SCHEDULED_JOBS, type ScheduledJobId } from "../../config/scheduled-jobs";
import { describeMonitorError } from "../ask-tuesday/monitor";
import { captureServerError } from "./client-errors";
import { runScheduledJob, startScheduledJobs, type ScheduledJob, type ScheduledJobDocument } from "./scheduled-jobs";

// The same job functions the CRON_SECRET routes call (app/api/*/cron).
// A late catch-up uses "insert-only" so a snapshot a page load already wrote
// nearer the nightly cutoff is kept; the on-time run overwrites like the cron.
export const SERVER_SCHEDULED_JOBS: readonly ScheduledJob[] = [
  {id: "debt-snapshot", run: async ({catchUp}) => {
    const {recordTodayDebtSnapshot} = await import("../../app/api/debt-snapshots/record-snapshot");
    return recordTodayDebtSnapshot(catchUp ? "insert-only" : "overwrite");
  }},
  {id: "backlog-snapshot", run: async ({catchUp}) => {
    const {recordTodayBacklogSnapshot} = await import("../../app/api/backlog-snapshots/record-snapshot");
    return recordTodayBacklogSnapshot(catchUp ? "insert-only" : "overwrite");
  }},
  {id: "health-snapshot", run: async () => {
    const {recordTodayHealthSnapshot} = await import("../../app/api/health-snapshots/record-snapshot");
    return recordTodayHealthSnapshot();
  }},
  {id: "delivery-briefing", run: async () => {
    const {getDeliveryBriefing} = await import("./delivery-briefing");
    const {pending} = await getDeliveryBriefing(new Date());
    // Another process holds the briefing lease; retry later to confirm it saved.
    if (pending) throw new Error("Delivery briefing is still being prepared.");
  }},
];

const reportJobError = (id: ScheduledJobId, error: unknown) => {
  console.error(`${SCHEDULED_JOBS.failureMessage} (${id}) ${describeMonitorError(error)}`);
  void captureServerError(`scheduler:${id}`, error);
};

export async function runServerScheduledJob(job: ScheduledJob) {
  const mode = process.env.NEXT_PUBLIC_MODE;
  if (!mode) throw new Error("NEXT_PUBLIC_MODE is not set.");
  const {getDb} = await import("../../app/api/db/connect");
  const collection = (await getDb()).collection<ScheduledJobDocument>(`${SCHEDULED_JOBS.collection}-${mode}`);
  const result = await runScheduledJob({collection, job, now: () => new Date(), makeToken: randomUUID, reportError: reportJobError});
  if (result === "succeeded") console.info(`Scheduled job ${job.id} finished.`);
  return result;
}

export function startServerScheduledJobs() {
  const loop = startScheduledJobs({jobs: SERVER_SCHEDULED_JOBS, runJob: runServerScheduledJob, reportFailure: reportJobError});
  process.once("SIGTERM", loop.stop);
  process.once("SIGINT", loop.stop);
}
