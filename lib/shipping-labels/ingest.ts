import { createHash, randomUUID } from "node:crypto";

import type { ShippingLabelRecord } from "@/types/shipping-labels";
import { splitPdfPages } from "./pdf";
import {
  MAX_LABEL_PAGE_COUNT,
  MAX_LABEL_PDF_BYTES,
} from "./config";
import { futurePageKey, futureSourceKey } from "./storage";

const PDF_CONTENT_TYPE = "application/pdf";

export type IngestShippingLabelInput = {
  orderId: string;
  sourceFileName: string;
  pdfBuffer: Buffer;
};

export type IngestShippingLabelResult = {
  uploadId: string;
  labels: ShippingLabelRecord[];
  duplicate: boolean;
};

export type IngestShippingLabelDeps = {
  orderExists: (orderId: string) => Promise<boolean>;
  findBySource: (
    orderId: string,
    sourceFileHash: string
  ) => Promise<ShippingLabelRecord[]>;
  saveRecord: (record: ShippingLabelRecord) => Promise<ShippingLabelRecord>;
  uploadObject: (
    key: string,
    bytes: Buffer,
    contentType: string
  ) => Promise<void>;
  createId: () => string;
  now: () => number;
};

export const defaultIngestShippingLabelDeps = {
  createId: randomUUID,
  now: Date.now,
};

function sourceHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function sortByPage(records: ShippingLabelRecord[]): ShippingLabelRecord[] {
  return [...records].sort((left, right) => left.pageNumber - right.pageNumber);
}

export async function ingestShippingLabelPdf(
  input: IngestShippingLabelInput,
  deps: IngestShippingLabelDeps
): Promise<IngestShippingLabelResult> {
  if (!(await deps.orderExists(input.orderId))) {
    throw new Error("Order not found for shipping-label upload.");
  }
  if (input.pdfBuffer.length === 0) {
    throw new Error("Shipping-label PDF is empty.");
  }
  if (input.pdfBuffer.length > MAX_LABEL_PDF_BYTES) {
    throw new Error("Shipping-label PDF exceeds the upload size limit.");
  }

  const hash = sourceHash(input.pdfBuffer);
  const existing = sortByPage(
    await deps.findBySource(input.orderId, hash)
  );
  const pages = await splitPdfPages(input.pdfBuffer);

  if (pages.length === 0) {
    throw new Error("Shipping-label PDF contains no pages.");
  }
  if (pages.length > MAX_LABEL_PAGE_COUNT) {
    throw new Error("Shipping-label PDF exceeds the page limit.");
  }
  if (
    existing.length === pages.length &&
    existing.every((record, index) => record.pageNumber === index + 1)
  ) {
    return {
      uploadId: existing[0]!.uploadId,
      labels: existing,
      duplicate: true,
    };
  }

  const uploadId = existing[0]?.uploadId ?? deps.createId();
  if (existing.length === 0) {
    await deps.uploadObject(
      futureSourceKey(input.orderId, uploadId),
      input.pdfBuffer,
      PDF_CONTENT_TYPE
    );
  }

  const labels = [...existing];
  const existingPages = new Set(existing.map((record) => record.pageNumber));

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const pageNumber = pageIndex + 1;
    if (existingPages.has(pageNumber)) continue;

    const labelId = deps.createId();
    const s3Key = futurePageKey(input.orderId, labelId);
    const pageBytes = pages[pageIndex]!;
    await deps.uploadObject(s3Key, pageBytes, PDF_CONTENT_TYPE);

    const timestamp = deps.now();
    const saved = await deps.saveRecord({
      id: labelId,
      orderId: input.orderId,
      uploadId,
      sourceFileName: input.sourceFileName,
      sourceFileHash: hash,
      pageNumber,
      pageCount: pages.length,
      s3Key,
      processingStatus: "pending",
      trackingNumber: null,
      carrier: null,
      trackerId: null,
      tracker: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    labels.push(saved);
  }

  return {
    uploadId,
    labels: sortByPage(labels),
    duplicate: existing.length > 0,
  };
}
