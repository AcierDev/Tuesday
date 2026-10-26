// Light validation for free-typed sizes / designs: collapse whitespace, cap the
// length, and require at least one letter or digit. Returns the cleaned value,
// or null when it can't be used.
export const CUSTOM_OPTION_MAX_LENGTH = 40;

const HAS_ALPHANUMERIC = /[a-z0-9]/i;

export function normalizeCustomOption(raw: string): string | null {
  const value = raw.trim().replace(/\s+/g, " ");
  if (!value || value.length > CUSTOM_OPTION_MAX_LENGTH) return null;
  return HAS_ALPHANUMERIC.test(value) ? value : null;
}

// Short inline hint for a typed value normalizeCustomOption rejected.
export function customOptionHint(raw: string): string | null {
  const value = raw.trim();
  if (!value || normalizeCustomOption(raw) !== null) return null;
  return value.length > CUSTOM_OPTION_MAX_LENGTH
    ? `Max ${CUSTOM_OPTION_MAX_LENGTH} characters`
    : "Use letters or numbers";
}
