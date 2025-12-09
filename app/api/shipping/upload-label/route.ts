import { NextResponse } from "next/server";
import { uploadLabel, getPublicUrl } from "@/lib/s3-client";

export async function POST(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const filename = searchParams.get("filename");

  if (!filename) {
    return NextResponse.json(
      { error: "Filename is required" },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("label") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const url = await uploadLabel(
      filename,
      buffer,
      file.type || "application/pdf"
    );

    return NextResponse.json({
      success: true,
      url,
      filename,
    });
  } catch (error) {
    console.error("Failed to upload PDF to S3:", error);
    return NextResponse.json(
      { error: "Failed to upload PDF" },
      { status: 500 }
    );
  }
}
