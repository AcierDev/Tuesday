import type { Activity, Item } from "../../typings/types";

export type AskTuesdayRequest = {
  question: string;
  page: string;
  orderSearch?: string;
};

export type SourceReference = { label: string; href: string };

export type SavedFinding = {
  key: string;
  customer: string;
  status: "unresolved" | "resolved" | "unknown";
  evidence: string[];
  action: string | null;
  observedOn: string | null;
  sources: SourceReference[];
  uncertainty: string[];
};

export type VerifiedMessage = {
  id: string;
  sentAt: string;
  sender: "buyer" | "seller";
  text: string;
};

export type SavedAgreement = {
  status: "final" | "proposal" | "superseded";
  text: string;
  messageIds: string[];
};

export type ConversationSnapshot = {
  threadId: string;
  buyerName: string;
  checkedAt: string;
  historyComplete: boolean;
  evidenceTruncated?: boolean;
  orderIds: string[];
  messages: VerifiedMessage[];
  agreements: SavedAgreement[];
};

export type TuesdayKnowledge = {
  schemaVersion: 1;
  importedAt: string;
  reviewObservedOn: string | null;
  sourceUpdatedAt: string | null;
  limitations: string[];
  evidenceTruncated?: boolean;
  excludedAuditCustomers?: string[];
  findings: SavedFinding[];
  conversations: ConversationSnapshot[];
};

export type AskOrder = Pick<Item,
  "id" | "customerName" | "design" | "size" | "notes" | "labels" |
  "status" | "dueDate" | "visible" | "deleted" | "onHold" |
  "dueDatePauseOffsetDays" | "tags"
>;

export type AskActivity = Pick<Activity, "id" | "itemId" | "timestamp" | "type" | "changes" | "metadata">;

export type TuesdaySnapshot = {
  orders: AskOrder[];
  activities: AskActivity[];
  knowledge: TuesdayKnowledge | null;
  ordersCheckedAt: string | null;
  activitiesCheckedAt: string | null;
  ordersTruncated: boolean;
  activitiesTruncated: boolean;
  limitations: string[];
};

export type AskTuesdayResult = {
  kind: "order" | "finding" | "conversation" | "activity";
  key: string;
  title: string;
  detail: string;
  facts: string[];
  sources: SourceReference[];
  orderId?: string;
  observedAt: string | null;
  observedPrecision: "date" | "time";
  uncertainty: string[];
  agreements?: SavedAgreement[];
  messages?: VerifiedMessage[];
};

export type AskTuesdayResponse = {
  mode: "record-search";
  summary: string;
  page: string;
  results: AskTuesdayResult[];
  totalMatches: number;
  freshness: {
    ordersCheckedAt: string | null;
    activitiesCheckedAt: string | null;
    reviewObservedOn: string | null;
    sourceUpdatedAt: string | null;
    importedAt: string | null;
  };
  capabilities: {
    inference: "unavailable";
    liveEtsy: "unavailable";
    savedConversations: "available" | "unavailable";
  };
  limitations: string[];
};

export type TuesdayIssue = AskTuesdayResult & {
  rule: "overdue" | "requirements-check" | "saved-review";
  severity: "attention" | "review";
};

export type TuesdayScanResponse = {
  mode: "issue-scan";
  checkedAt: string;
  status: "checked" | "partial" | "unavailable";
  issues: TuesdayIssue[];
  totalIssues: number;
  freshness: AskTuesdayResponse["freshness"];
  capabilities: AskTuesdayResponse["capabilities"];
  limitations: string[];
};
