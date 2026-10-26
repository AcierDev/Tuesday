import { NextResponse } from "next/server";
import { deleteLabel, getLabel } from "@/lib/s3-client";
import {
  inlineContentDisposition,
  isSafeLegacyLabelFilename,
} from "@/lib/shipping-labels/legacy-filename";

const INVALID_FILENAME_RESPONSE = { error: "Invalid label filename" };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!isSafeLegacyLabelFilename(filename)) {
      return NextResponse.json(INVALID_FILENAME_RESPONSE, { status: 400 });
    }
    const buffer = await getLabel(filename);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": inlineContentDisposition(filename),
      },
    });
  } catch (error) {
    console.error("Failed to fetch PDF from S3:", error);
    return NextResponse.json(
      { error: "Failed to fetch PDF" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!isSafeLegacyLabelFilename(filename)) {
      return NextResponse.json(INVALID_FILENAME_RESPONSE, { status: 400 });
    }

    await deleteLabel(filename);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete PDF from S3:", error);
    return NextResponse.json(
      { error: "Failed to delete PDF" },
      { status: 500 }
    );
  }
}
