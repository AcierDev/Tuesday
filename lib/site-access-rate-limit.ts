// Wrong site-password attempts are counted in memory. That suits the single PM2
// process; a restart clears the counts.
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
export const SITE_ACCESS_FAILURE_WINDOW_MINUTES = 15;
export const SITE_ACCESS_FAILURE_WINDOW_MS = SITE_ACCESS_FAILURE_WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
export const SITE_ACCESS_MAX_FAILURES_PER_CLIENT = 10;
// X-Forwarded-For can be forged when no proxy rewrites it, so a shared ceiling
// still bounds guessing across all clients. Signed-in browsers are unaffected.
export const SITE_ACCESS_MAX_FAILURES_TOTAL = 100;
const MAX_TRACKED_CLIENTS = 10_000;
const UNKNOWN_CLIENT = "unknown";

type FailureWindow = { count: number; resetAt: number };
type Limits = { windowMs: number; maxPerClient: number; maxTotal: number };

export function siteAccessClient(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || UNKNOWN_CLIENT;
}

export function createSiteAccessLimiter(limits: Limits = {
  windowMs: SITE_ACCESS_FAILURE_WINDOW_MS,
  maxPerClient: SITE_ACCESS_MAX_FAILURES_PER_CLIENT,
  maxTotal: SITE_ACCESS_MAX_FAILURES_TOTAL,
}) {
  const clients = new Map<string, FailureWindow>();
  let total: FailureWindow = { count: 0, resetAt: 0 };
  const active = (entry: FailureWindow | undefined, now: number) => entry && entry.resetAt > now ? entry : undefined;
  const increment = (entry: FailureWindow | undefined, now: number): FailureWindow =>
    entry ? { ...entry, count: entry.count + 1 } : { count: 1, resetAt: now + limits.windowMs };

  return {
    /** Milliseconds until this client may try again; 0 when allowed. */
    retryAfterMs(client: string, now = Date.now()): number {
      const blocks = [
        { entry: active(clients.get(client), now), max: limits.maxPerClient },
        { entry: active(total, now), max: limits.maxTotal },
      ].filter(({ entry, max }) => entry && entry.count >= max);
      return blocks.length ? Math.max(...blocks.map(({ entry }) => entry!.resetAt - now)) : 0;
    },
    recordFailure(client: string, now = Date.now()) {
      total = increment(active(total, now), now);
      const existing = active(clients.get(client), now);
      if (!existing && clients.size >= MAX_TRACKED_CLIENTS) {
        for (const [key, entry] of clients) if (!active(entry, now)) clients.delete(key);
        // Still full: drop the oldest window rather than grow without bound.
        if (clients.size >= MAX_TRACKED_CLIENTS) clients.delete(clients.keys().next().value!);
      }
      clients.delete(client);
      clients.set(client, increment(existing, now));
    },
    recordSuccess(client: string) {
      clients.delete(client);
    },
  };
}
