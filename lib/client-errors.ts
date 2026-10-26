import { CLIENT_ERRORS } from "@/config/client-errors";

// Browser error reporting to the self-hosted /api/client-errors store.
// Shared by instrumentation-client.ts, the app error boundaries and the route.
export const CLIENT_ERROR_SOURCES = ["window-error", "unhandled-rejection", "error-boundary", "global-error"] as const;
export type ClientErrorSource = (typeof CLIENT_ERROR_SOURCES)[number];
export type ClientErrorReport = {source: ClientErrorSource; message: string; stack?: string; digest?: string; url?: string};

const clip = (value: unknown, maxLength: number): string | undefined =>
  typeof value === "string" && value.trim() ? value.slice(0, maxLength) : undefined;

/** Validates and size-caps an untrusted report; null when it is unusable. */
export function normalizeClientErrorReport(value: unknown): ClientErrorReport | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const source = CLIENT_ERROR_SOURCES.find(candidate => candidate === record.source);
  const message = clip(record.message, CLIENT_ERRORS.maxMessageLength);
  if (!source || !message) return null;
  const stack = clip(record.stack, CLIENT_ERRORS.maxStackLength);
  const digest = clip(record.digest, CLIENT_ERRORS.maxDigestLength);
  const url = clip(record.url, CLIENT_ERRORS.maxUrlLength);
  return {source, message, ...(stack ? {stack} : {}), ...(digest ? {digest} : {}), ...(url ? {url} : {})};
}

/** Message and stack for anything thrown or rejected (rejections need not be Errors). */
export function describeThrown(value: unknown): {message: string; stack?: string} {
  if (value instanceof Error) return {message: value.message || value.name, stack: value.stack};
  if (typeof value === "string") return {message: value};
  try {
    return {message: JSON.stringify(value) ?? String(value)};
  } catch {
    return {message: String(value)};
  }
}

const lastSentAt = new Map<string, number>();
let sentThisPage = 0;

/** Fire-and-forget; never throws. Development errors stay in the Next overlay. */
export function reportClientError(source: ClientErrorSource, error: unknown, details: {digest?: string} = {}): void {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "production") return;
  try {
    const {message, stack} = describeThrown(error);
    if (CLIENT_ERRORS.ignoredMessages.some(ignored => message.includes(ignored))) return;
    const key = `${message}\n${stack ?? ""}`;
    const now = Date.now();
    const previous = lastSentAt.get(key);
    if (sentThisPage >= CLIENT_ERRORS.maxReportsPerPage
      || (previous !== undefined && now - previous < CLIENT_ERRORS.browserDedupeWindowMs)) return;
    // Path only: query strings can carry customer details.
    const report = normalizeClientErrorReport({source, message, stack, digest: details.digest, url: window.location.pathname});
    if (!report) return;
    lastSentAt.set(key, now);
    sentThisPage += 1;
    // keepalive lets a report sent during navigation or unload still arrive.
    void fetch(CLIENT_ERRORS.endpoint, {
      method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(report),
      credentials: "same-origin", keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Reporting must never cause another error.
  }
}

/** Uncaught errors and unhandled promise rejections anywhere on the page. */
export function installClientErrorReporting(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("error", event => reportClientError("window-error", event.error ?? event.message));
  window.addEventListener("unhandledrejection", event => reportClientError("unhandled-rejection", event.reason));
}
