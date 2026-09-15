import type { DeliveryBriefing, DeliveryBriefingResponse } from "./delivery-briefing";

export const MORNING_BRIEFING_CONFIG = {
  timeZone: "America/Los_Angeles",
  startHour: 7,
  checkIntervalMs: 30_000,
  requestTimeoutMs: 45_000,
  storageKey: "tuesday:morning-briefing:received-day",
  lockName: "tuesday:morning-briefing",
  endpoint: "/api/stats/delivery-briefing",
} as const;

const morningClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: MORNING_BRIEFING_CONFIG.timeZone,
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
});

export function morningBriefingDay(now: Date): string | null {
  const parts = morningClock.formatToParts(now);
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === name)?.value;
  if (Number(part("hour")) < MORNING_BRIEFING_CONFIG.startHour) return null;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isMorningBriefingPage(path: string): boolean {
  return path === "/orders" || path === "/production-planning";
}

export interface MorningBriefingDeps {
  now: () => Date;
  available: () => boolean;
  readReceivedDay: () => string | null;
  writeReceivedDay: (day: string) => void;
  load: () => Promise<DeliveryBriefingResponse>;
  show: (report: DeliveryBriefing) => void;
}

// Call within a browser-wide Web Lock. Only record delivery after a current
// report is ready and this tab is still visible, focused, and free of dialogs.
export async function deliverMorningBriefing(deps: MorningBriefingDeps): Promise<void> {
  const day = morningBriefingDay(deps.now());
  if (!day || !deps.available() || deps.readReceivedDay() === day) return;
  const payload = await deps.load();
  if (payload.pending || !payload.report || payload.report.date !== day) return;
  if (!deps.available() || morningBriefingDay(deps.now()) !== day || deps.readReceivedDay() === day) return;
  // If persistence fails, don't show an automatic popup that would repeat later.
  deps.writeReceivedDay(day);
  deps.show(payload.report);
}
