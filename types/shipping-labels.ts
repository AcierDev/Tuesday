import type { Tracker } from "@/typings/types";

export type ShippingLabelProcessingStatus =
  | "pending"
  | "scanning"
  | "ready"
  | "needs_review";

export type ShippingLabelCategory = "unused" | "used" | "issues";

export type ShippingLabelCarrier = "FedEx" | "UPS" | "USPS" | "DHL";

export type ShippingLabelRecord = {
  id: string;
  orderId: string;
  uploadId: string;
  sourceFileName: string;
  sourceFileHash: string;
  pageNumber: number;
  pageCount: number;
  s3Key: string;
  processingStatus: ShippingLabelProcessingStatus;
  processingError?: string;
  trackingNumber: string | null;
  carrier: ShippingLabelCarrier | null;
  trackerId: string | null;
  tracker: Tracker | null;
  createdAt: number;
  updatedAt: number;
};

export type FutureLabelSummary = {
  total: number;
  unused: number;
  used: number;
  issues: number;
  latestCreatedAt?: number;
};

export type FutureLabelSummariesByOrder = Record<string, FutureLabelSummary>;
