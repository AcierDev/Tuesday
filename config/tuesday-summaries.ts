export const TUESDAY_SUMMARIES = {
  collection: "ask-tuesday-summaries",
  defaultModel: "gemini-2.5-flash-lite",
  maxGenerationsPerRun: 2,
  modelTimeoutMs: 30_000,
  attemptLeaseMs: 45_000,
  failureCooldownMs: 900_000,
  maxPromptBytes: 100_000,
  maxOutputBytes: 12_000,
  maxOutputTokens: 2_500,
  modelTemperature: 0.2,
  duplicateKeyError: 11_000,
} as const;
