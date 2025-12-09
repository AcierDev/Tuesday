import { NextResponse } from "next/server";
import { listAllLabels } from "@/lib/s3-client";

export async function GET() {
  try {
    const labels = await listAllLabels();
    return NextResponse.json(labels);
  } catch (error) {
    console.error("Failed to fetch PDFs from S3:", error);
    return NextResponse.json(
      { error: "Failed to fetch PDFs" },
      { status: 500 }
    );
  }
}
