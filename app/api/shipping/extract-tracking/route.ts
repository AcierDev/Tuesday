import { NextResponse } from "next/server";

import { extractTrackingInfoCandidate } from "@/lib/shipping-label-extraction";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get("label");

    if (!(pdfFile instanceof File)) {
      return NextResponse.json(
        { error: "No PDF file provided" },
        { status: 400 }
      );
    }

    const candidate = await extractTrackingInfoCandidate(
      Buffer.from(await pdfFile.arrayBuffer())
    );
    return NextResponse.json(candidate);
  } catch (error) {
    console.error("Failed to process tracking PDF:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}
