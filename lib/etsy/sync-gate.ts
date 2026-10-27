import { ETSY_CONFIG } from "../../config/etsy";
import { shouldStartTuesdayMonitor } from "../ask-tuesday/monitor";

// Pure (instrumentation.ts loads it in every runtime). Same production/runtime
// gating as the other background loops, with its own opt-out flag.
export function shouldStartEtsySync(environment: Record<string, string | undefined>): boolean {
  return shouldStartTuesdayMonitor({...environment, ASK_TUESDAY_MONITOR_ENABLED: environment[ETSY_CONFIG.syncEnabledEnv]});
}
