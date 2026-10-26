import { NextResponse } from "next/server";

import {
  extractTrackingForUpload,
  extractTrackingInfoCandidate,
  MAX_EXTRACTION_UPLOAD_BYTES,
} from "@/lib/shipping-label-extraction";

export const runtime = "nodejs";

// Room for multipart boundaries and the form field headers around the PDF.
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const HTTP_PAYLOAD_TOO_LARGE = 413;

export async function POST(request: Request) {
  try {
    // Refuse oversized bodies before buffering the multipart form.
    const declaredLength = Number(request.headers.get("content-length"));
    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_EXTRACTION_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES
    ) {
      return NextResponse.json(
        { error: "Label PDF is too large to scan." },
        { status: HTTP_PAYLOAD_TOO_LARGE }
      );
    }

    const formData = await request.formData();
    const { status, body } = await extractTrackingForUpload(
      formData.get("label"),
      extractTrackingInfoCandidate,
      { signal: request.signal }
    );
    return NextResponse.json(body, { status });
  } catch (error) {
    console.error("Failed to process tracking PDF:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}
