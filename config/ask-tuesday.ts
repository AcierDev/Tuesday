export const ASK_TUESDAY = {
  maxQuestionLength: 600,
  maxBodyBytes: 16_384,
  maxSearchTerms: 8,
  minSearchTermLength: 2,
  maxResults: 12,
  maxLoadedOrders: 500,
  maxLoadedActivities: 100,
  maxFindings: 500,
  maxConversations: 100,
  maxMessagesPerConversation: 1000,
  maxTextLength: 12_000,
  maxSourcesPerRecord: 20,
  dueSoonDays: 3,
  activityWindowDays: 7,
  requestTimeoutMs: 20_000,
  maxChatTurns: 20,
  scanIntervalMs: 60_000,
  scanEndpoint: "/api/ask-tuesday/scan",
  maxScanIssues: 50,
  resultPriority: { conversation: 0, finding: 1, order: 2, activity: 3 },
  localKnowledgeFile: "data/ask-tuesday-knowledge.json",
  knowledgeCollection: "ask-tuesday-knowledge",
  knowledgeDocumentId: "latest",
  timeZone: "America/Los_Angeles",
} as const;

export const ASK_TUESDAY_HTTP = {
  ok: 200,
  badRequest: 400,
  unauthorized: 401,
  tooLarge: 413,
  failure: 500,
} as const;

export const ASK_TUESDAY_NO_STORE = { "Cache-Control": "private, no-store" };
