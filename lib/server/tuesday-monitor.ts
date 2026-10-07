import { randomUUID } from "node:crypto";
import { TUESDAY_MONITOR } from "../../config/tuesday-monitor";
import { runTuesdayMonitor, startTuesdayMonitor, type TuesdayMonitorDocument } from "../ask-tuesday/monitor";
import { readTuesdaySnapshot } from "../ask-tuesday/server";
import { scanTuesdaySnapshot } from "../ask-tuesday/scan";
import { summarizeTuesdaySnapshot } from "./tuesday-summaries";

export async function runServerTuesdayMonitor() {
  const mode = process.env.NEXT_PUBLIC_MODE;
  if (!mode) throw new Error(TUESDAY_MONITOR.failureMessage);
  const {getDb} = await import("../../app/api/db/connect");
  const db = await getDb();
  return runTuesdayMonitor({
    collection: db.collection<TuesdayMonitorDocument>(`${TUESDAY_MONITOR.collection}-${mode}`),
    now: () => new Date().toISOString(), makeToken: randomUUID,
    work: async () => {
      const snapshot = await readTuesdaySnapshot(TUESDAY_MONITOR.request);
      if (!snapshot.ordersCheckedAt) throw new Error(TUESDAY_MONITOR.failureMessage);
      const now = new Date().toISOString();
      const summaries = await summarizeTuesdaySnapshot(snapshot, db, now);
      return {scan: scanTuesdaySnapshot(snapshot, new Date().toISOString()), ...summaries};
    },
  });
}

export function startServerTuesdayMonitor() {
  const loop = startTuesdayMonitor({tick: runServerTuesdayMonitor,
    reportFailure: () => console.error(TUESDAY_MONITOR.failureMessage)});
  process.once("SIGTERM", loop.stop);
  process.once("SIGINT", loop.stop);
}
