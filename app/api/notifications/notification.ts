export const NOTIFICATION_FIELD_MAX_LENGTH = 120;
export const NOTIFICATIONS_MAX_PER_MINUTE = 10;
const MILLISECONDS_PER_MINUTE = 60_000;
const NOTIFICATION_FIELDS = ["customerName", "size", "design"] as const;
const TRUNCATION_MARK = "…";

export type OrderNotification = Record<(typeof NOTIFICATION_FIELDS)[number], string>;

// One line per field, so submitted text cannot add lines to the alert.
function field(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\s\p{Cc}]+/gu, " ").trim();
  if (!text) return null;
  return text.length > NOTIFICATION_FIELD_MAX_LENGTH
    ? `${text.slice(0, NOTIFICATION_FIELD_MAX_LENGTH - TRUNCATION_MARK.length)}${TRUNCATION_MARK}` : text;
}

export function parseOrderNotification(value: unknown): OrderNotification | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const parsed: Partial<OrderNotification> = {};
  for (const name of NOTIFICATION_FIELDS) {
    const text = field(input[name]);
    if (!text) return null;
    parsed[name] = text;
  }
  return parsed as OrderNotification;
}

export function orderNotificationMessage({ customerName, size, design }: OrderNotification): string {
  return `New Order Submitted:\nCustomer: ${customerName}\nSize: ${size}\nDesign: ${design}`;
}

/** Fixed one-minute window shared by every caller of this process. */
export function createMinuteThrottle(maxPerMinute = NOTIFICATIONS_MAX_PER_MINUTE) {
  let windowStart = 0;
  let count = 0;
  return (now = Date.now()): boolean => {
    if (now - windowStart >= MILLISECONDS_PER_MINUTE) {
      windowStart = now;
      count = 0;
    }
    if (count >= maxPerMinute) return false;
    count += 1;
    return true;
  };
}
