import {
  buildShippingLabelPrintPdf,
  type ShippingLabelPrintDeps,
  type ShippingLabelPrintRequest,
} from "./print";

const BAD_REQUEST_STATUS = 400;
const PDF_CONTENT_TYPE = "application/pdf";
const JSON_CONTENT_TYPE = "application/json";
const SAFE_FILENAME_CHARACTER_PATTERN = /[^a-zA-Z0-9_-]/g;

function jsonError(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: BAD_REQUEST_STATUS,
    headers: { "Content-Type": JSON_CONTENT_TYPE },
  });
}

function parsePrintRequest(value: unknown): ShippingLabelPrintRequest {
  if (!value || typeof value !== "object") {
    throw new Error("A label print request is required.");
  }
  const body = value as Record<string, unknown>;
  if (typeof body.orderId !== "string" || !body.orderId.trim()) {
    throw new Error("Order ID is required for label printing.");
  }
  if (body.scope === "unused") {
    return { orderId: body.orderId, scope: "unused" };
  }
  if (
    Array.isArray(body.labelIds) &&
    body.labelIds.every((id) => typeof id === "string")
  ) {
    return { orderId: body.orderId, labelIds: body.labelIds as string[] };
  }
  throw new Error("Choose all unused labels or specific unused label IDs.");
}

export async function handlePrintFutureLabels(
  request: Request,
  deps: ShippingLabelPrintDeps
): Promise<Response> {
  try {
    const printRequest = parsePrintRequest(await request.json());
    const pdf = await buildShippingLabelPrintPdf(printRequest, deps);
    const safeOrderId = printRequest.orderId.replace(
      SAFE_FILENAME_CHARACTER_PATTERN,
      "-"
    );
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": PDF_CONTENT_TYPE,
        "Content-Disposition": `inline; filename="unused-labels-${safeOrderId}.pdf"`,
      },
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Labels could not be printed."
    );
  }
}
