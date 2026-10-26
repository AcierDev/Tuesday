// In-process daily jobs (lib/server/scheduled-jobs.ts). Times are wall-clock in
// `timeZone`, so they follow DST; each job runs once per local day.
export const NIGHTLY_SNAPSHOT_TIME = {hour: 0, minute: 30} as const;
// vercel.json's "5 7,8 * * *" UTC is 00:05 Pacific in both PDT and PST.
export const DELIVERY_BRIEFING_TIME = {hour: 0, minute: 5} as const;

export const SCHEDULED_JOBS = {
  collection: "scheduled-jobs",
  timeZone: "America/Los_Angeles",
  enabledEnv: "SCHEDULED_JOBS_ENABLED",
  checkIntervalMs: 60_000,
  leaseDurationMs: 600_000,
  retryDelayMs: 900_000,
  // Runs later than this after their time are startup catch-ups, not the nightly run.
  onTimeWindowMinutes: 60,
  duplicateKeyError: 11000,
  failureMessage: "Scheduled job failed; it will retry.",
  times: {
    "debt-snapshot": NIGHTLY_SNAPSHOT_TIME,
    "backlog-snapshot": NIGHTLY_SNAPSHOT_TIME,
    "health-snapshot": NIGHTLY_SNAPSHOT_TIME,
    "delivery-briefing": DELIVERY_BRIEFING_TIME,
  },
} as const;

export type ScheduledJobId = keyof typeof SCHEDULED_JOBS.times;
