export const TUESDAY_MONITOR = {
  collection: "ask-tuesday-monitor",
  documentId: "latest",
  intervalMs: 60_000,
  leaseDurationMs: 180_000,
  staleAfterMs: 180_000,
  duplicateKeyError: 11000,
  failureMessage: "Background checks could not finish. Previous results remain available.",
  summaryFailureMessage: "Some saved message summaries could not be prepared.",
  request: {question: "What needs attention?", page: "/orders"},
} as const;
