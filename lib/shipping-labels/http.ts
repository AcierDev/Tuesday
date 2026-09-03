import type {
  FutureLabelSummariesByOrder,
  ShippingLabelRecord,
} from "@/types/shipping-labels";
import type {
  IngestShippingLabelInput,
  IngestShippingLabelResult,
} from "./ingest";
import { isFutureLabelPageKey } from "./storage";

const PDF_CONTENT_TYPE = "application/pdf";
const JSON_HEADERS = { "Content-Type": "application/json" };

export type ShippingLabelHttpDeps = {
  ingest: (
    input: IngestShippingLabelInput
  ) => Promise<IngestShippingLabelResult>;
  listLabels: (orderId: string) => Promise<ShippingLabelRecord[]>;
  summarizeLabels: () => Promise<FutureLabelSummariesByOrder>;
  getLabel: (labelId: string) => Promise<ShippingLabelRecord | null>;
  getObject: (key: string) => Promise<Buffer>;
  deleteObject: (key: string) => Promise<void>;
  deleteRecord: (labelId: string) => Promise<ShippingLabelRecord | null>;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected shipping-label error.";
}

function isPdfFile(value: FormDataEntryValue | null): value is File {
  if (!value || typeof value === "string") return false;
  const hasPdfMime = value.type === PDF_CONTENT_TYPE;
  const hasPdfExtension =
    value.type === "" && value.name.toLowerCase().endsWith(".pdf");
  return hasPdfMime || hasPdfExtension;
}

export async function handleFutureLabelUpload(
  request: Request,
  deps: ShippingLabelHttpDeps
): Promise<Response> {
  try {
    const formData = await request.formData();
    const orderIdValue = formData.get("orderId");
    const fileValue = formData.get("label");
    const orderId =
      typeof orderIdValue === "string" ? orderIdValue.trim() : "";

    if (!orderId) return json({ error: "Order ID is required." }, 400);
    if (!isPdfFile(fileValue)) {
      return json({ error: "A PDF shipping-label file is required." }, 400);
    }

    const result = await deps.ingest({
      orderId,
      sourceFileName: fileValue.name,
      pdfBuffer: Buffer.from(await fileValue.arrayBuffer()),
    });
    return json(result, result.duplicate ? 200 : 201);
  } catch (error) {
    const message = errorMessage(error);
    const status = /order not found/i.test(message) ? 404 : 400;
    return json({ error: message }, status);
  }
}

export async function handleListFutureLabels(
  searchParams: URLSearchParams,
  deps: ShippingLabelHttpDeps
): Promise<Response> {
  const orderId = searchParams.get("orderId")?.trim();
  if (!orderId) return json({ error: "Order ID is required." }, 400);

  try {
    return json({ labels: await deps.listLabels(orderId) });
  } catch (error) {
    return json({ error: errorMessage(error) }, 500);
  }
}

export async function handleSummarizeFutureLabels(
  deps: ShippingLabelHttpDeps
): Promise<Response> {
  try {
    return json({ summaries: await deps.summarizeLabels() });
  } catch (error) {
    return json({ error: errorMessage(error) }, 500);
  }
}

export async function handleFutureLabelPdf(
  labelId: string,
  deps: ShippingLabelHttpDeps
): Promise<Response> {
  try {
    const record = await deps.getLabel(labelId);
    if (!record) return json({ error: "Shipping label not found." }, 404);
    if (!isFutureLabelPageKey(record.s3Key)) {
      return json({ error: "Shipping label is not a future-label object." }, 409);
    }

    const bytes = await deps.getObject(record.s3Key);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": PDF_CONTENT_TYPE,
        "Content-Disposition": `inline; filename="label-${record.pageNumber}.pdf"`,
      },
    });
  } catch (error) {
    return json({ error: errorMessage(error) }, 500);
  }
}

export async function handleDeleteFutureLabel(
  labelId: string,
  deps: ShippingLabelHttpDeps
): Promise<Response> {
  try {
    const record = await deps.getLabel(labelId);
    if (!record) return json({ error: "Shipping label not found." }, 404);
    if (!isFutureLabelPageKey(record.s3Key)) {
      return json({ error: "Refusing to delete a legacy label object." }, 409);
    }

    await deps.deleteObject(record.s3Key);
    await deps.deleteRecord(labelId);
    return json({ success: true });
  } catch (error) {
    return json({ error: errorMessage(error) }, 500);
  }
}
