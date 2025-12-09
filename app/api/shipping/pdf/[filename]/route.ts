import { NextResponse } from "next/server";
import { deleteLabel } from "@/lib/s3-client";



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
