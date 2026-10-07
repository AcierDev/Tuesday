import { shouldStartTuesdayMonitor } from "./lib/ask-tuesday/monitor";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (!shouldStartTuesdayMonitor(process.env)) return;
    const {startServerTuesdayMonitor} = await import("./lib/server/tuesday-monitor");
    startServerTuesdayMonitor();
  }
}
