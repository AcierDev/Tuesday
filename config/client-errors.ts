// Self-hosted error reports (POST/GET /api/client-errors), stored in
// `${collection}-${NEXT_PUBLIC_MODE}`.
export const CLIENT_ERRORS = {
  collection: "clientErrors",
  endpoint: "/api/client-errors",
  maxBodyBytes: 16_384,
  maxMessageLength: 1_000,
  maxStackLength: 8_000,
  maxUrlLength: 500,
  maxUserAgentLength: 300,
  maxDigestLength: 100,
  // The same message + stack within this window increments one record's count.
  dedupeWindowMs: 600_000,
  // Oldest records beyond this are pruned, keeping storage bounded.
  maxStoredErrors: 1_000,
  rateLimitWindowMs: 60_000,
  maxReportsPerClient: 30,
  maxReportsTotal: 300,
  defaultListLimit: 20,
  maxListLimit: 100,
  recentWindowMs: 86_400_000,
  // Browser side: per page load.
  maxReportsPerPage: 20,
  browserDedupeWindowMs: 60_000,
  // Browser noise: cross-origin scripts and benign layout warnings.
  ignoredMessages: ["ResizeObserver loop", "Script error."],
} as const;
