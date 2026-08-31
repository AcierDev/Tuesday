import type { FutureLabelSummary, ShippingLabelRecord } from "@/types/shipping-labels";
import type { IngestShippingLabelResult } from "./ingest";
import { LABEL_SCAN_CONCURRENCY } from "./config";

export type FutureLabelClientApi = {
  upload: (
    orderId: string,
    file: File
  ) => Promise<IngestShippingLabelResult>;
  scan: (labelId: string) => Promise<ShippingLabelRecord>;
};

export type FutureLabelScanResult = {
  labelId: string;
  label?: ShippingLabelRecord;
  error?: string;
};

export type FutureLabelUploadResult = IngestShippingLabelResult & {
  scanResults: FutureLabelScanResult[];
};

export type FutureLabelScanCallbacks = {
  onUploaded?: (result: IngestShippingLabelResult) => void;
  onScanStarted?: (label: ShippingLabelRecord) => void;
  onScanSettled?: (
    label: ShippingLabelRecord,
    result: FutureLabelScanResult
  ) => void;
};

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Shipping label could not be scanned.";
}

async function scanLabels(
  labels: ShippingLabelRecord[],
  api: Pick<FutureLabelClientApi, "scan">,
  callbacks: FutureLabelScanCallbacks = {}
): Promise<FutureLabelScanResult[]> {
  const results = new Array<FutureLabelScanResult>(labels.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < labels.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const record = labels[currentIndex]!;
      callbacks.onScanStarted?.(record);
      try {
        results[currentIndex] = {
          labelId: record.id,
          label: await api.scan(record.id),
        };
      } catch (error) {
        results[currentIndex] = {
          labelId: record.id,
          error: errorMessage(error),
        };
      }
      callbacks.onScanSettled?.(record, results[currentIndex]!);
    }
  }

  const workerCount = Math.min(LABEL_SCAN_CONCURRENCY, labels.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export async function uploadAndScanFutureLabelFile(
  orderId: string,
  file: File,
  api: FutureLabelClientApi,
  callbacks: FutureLabelScanCallbacks = {}
): Promise<FutureLabelUploadResult> {
  const uploaded = await api.upload(orderId, file);
  callbacks.onUploaded?.(uploaded);
  return {
    ...uploaded,
    scanResults: await scanLabels(uploaded.labels, api, callbacks),
  };
}

export async function resumeIncompleteLabels(
  labels: ShippingLabelRecord[],
  api: Pick<FutureLabelClientApi, "scan">
): Promise<FutureLabelScanResult[]> {
  return scanLabels(
    labels.filter(
      (record) =>
        record.processingStatus === "pending" ||
        record.processingStatus === "needs_review" ||
        record.processingStatus === "scanning"
    ),
    api
  );
}

export function hasAnyShippingLabel(
  legacyLabels: string[],
  futureSummary: FutureLabelSummary | undefined
): boolean {
  return legacyLabels.length > 0 || Boolean(futureSummary?.total);
}
