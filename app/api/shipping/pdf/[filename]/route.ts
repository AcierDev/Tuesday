import { NextResponse } from "next/server";
import { getPublicUrl, deleteLabel } from "@/lib/s3-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Get the public S3 URL and fetch the PDF
    const url = getPublicUrl(filename);
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    // Proxy the PDF content to avoid CORS issues
    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to fetch PDF from S3:", error);
    return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

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
