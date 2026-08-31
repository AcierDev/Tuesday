import {
  FUTURE_LABEL_PAGE_PREFIX,
  FUTURE_LABEL_UPLOAD_PREFIX,
} from "./config";

function safeKeySegment(value: string): string {
  return encodeURIComponent(value.trim());
}

export function futureSourceKey(orderId: string, uploadId: string): string {
  return `${FUTURE_LABEL_UPLOAD_PREFIX}/${safeKeySegment(
    orderId
  )}/${safeKeySegment(uploadId)}/source.pdf`;
}

export function futurePageKey(orderId: string, labelId: string): string {
  return `${FUTURE_LABEL_PAGE_PREFIX}/${safeKeySegment(
    orderId
  )}/${safeKeySegment(labelId)}.pdf`;
}

export function filterLegacyLabelKeys(keys: string[]): string[] {
  return keys.filter(
    (key) => key.endsWith(".pdf") && !key.includes("/")
  );
}

export function isFutureLabelKey(key: string): boolean {
  return (
    key.startsWith(`${FUTURE_LABEL_UPLOAD_PREFIX}/`) ||
    key.startsWith(`${FUTURE_LABEL_PAGE_PREFIX}/`)
  );
}

export function isFutureLabelPageKey(key: string): boolean {
  return key.startsWith(`${FUTURE_LABEL_PAGE_PREFIX}/`);
}
