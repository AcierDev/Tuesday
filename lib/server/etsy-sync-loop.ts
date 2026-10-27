import { ETSY_CONFIG } from "../../config/etsy";
import { describeMonitorError } from "../ask-tuesday/monitor";

type EtsySyncGlobal = typeof globalThis & {__etsySyncLoop?: {stop: () => void}};

/** Imports new Etsy orders every `syncIntervalMs` (one loop per process; a Mongo lease keeps processes from overlapping). */
export function startServerEtsySync() {
  const state = globalThis as EtsySyncGlobal;
  if (state.__etsySyncLoop) return;
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      const {getDb} = await import("../../app/api/db/connect");
      const {syncEtsyOrders} = await import("../etsy/sync-server");
      await syncEtsyOrders(await getDb());
    } catch (error) {
      console.error(`Etsy order import failed: ${describeMonitorError(error)}`);
    } finally {
      busy = false;
    }
  };
  const startup = setTimeout(() => {void tick();}, ETSY_CONFIG.syncStartupDelayMs);
  const interval = setInterval(() => {void tick();}, ETSY_CONFIG.syncIntervalMs);
  startup.unref?.();
  interval.unref?.();
  const loop = {stop: () => {
    clearTimeout(startup);
    clearInterval(interval);
    if (state.__etsySyncLoop === loop) delete state.__etsySyncLoop;
  }};
  state.__etsySyncLoop = loop;
  process.once("SIGTERM", loop.stop);
  process.once("SIGINT", loop.stop);
}
