import { shouldStartTuesdayMonitor } from "./lib/ask-tuesday/monitor";
import { shouldStartScheduledJobs } from "./lib/server/scheduled-jobs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const environment = {...process.env, NEXT_RUNTIME: process.env.NEXT_RUNTIME};
    if (shouldStartTuesdayMonitor(environment)) {
      const {startServerTuesdayMonitor} = await import("./lib/server/tuesday-monitor");
      startServerTuesdayMonitor();
    }
    // Daily snapshot/briefing jobs; nothing calls the vercel.json crons on this host.
    if (shouldStartScheduledJobs(environment)) {
      const {startServerScheduledJobs} = await import("./lib/server/scheduled-jobs-runner");
      startServerScheduledJobs();
    }
  }
}
