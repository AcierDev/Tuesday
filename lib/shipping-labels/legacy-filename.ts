// Legacy label objects live at the bucket root as `<orderId>.pdf` or
// `<orderId>-<n>.pdf`. Only plain names are accepted so a request can never
// address another key (no slashes, no traversal, no header-breaking chars).
export const LEGACY_LABEL_FILENAME_PATTERN = /^[\w.-]+\.pdf$/;

export function isSafeLegacyLabelFilename(filename: unknown): filename is string {
  return (
    typeof filename === "string" &&
    LEGACY_LABEL_FILENAME_PATTERN.test(filename) &&
    !filename.startsWith(".")
  );
}

export function inlineContentDisposition(filename: string): string {
  const escaped = filename.replace(/["\\]/g, "\\$&");
  return `inline; filename="${escaped}"`;
}

// Digits only, so the name still matches `<orderId>-<n>.pdf` everywhere that
// groups legacy labels by order.
const UNIQUE_SUFFIX_RANDOM_DIGITS = 4;

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function legacyLabelKeyPattern(orderId: string): RegExp {
  return new RegExp(`^${escapeRegExp(orderId)}(?:-\\d+)?\\.pdf$`);
}

/** A collision-free `<orderId>-<n>.pdf` name without a list-then-pick race. */
export function uniqueLegacyLabelFilename(
  orderId: string,
  now: number = Date.now(),
  random: () => number = Math.random
): string {
  const randomDigits = Math.floor(random() * 10 ** UNIQUE_SUFFIX_RANDOM_DIGITS)
    .toString()
    .padStart(UNIQUE_SUFFIX_RANDOM_DIGITS, "0");
  return `${orderId}-${now}${randomDigits}.pdf`;
}
