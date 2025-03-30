import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const searchParams = new URL(request.url).searchParams;
  const filename = searchParams.get("filename");

  try {
    const response = await fetch(
      `http://144.172.71.72:3003/upload-label?filename=${filename}`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to upload PDF" },
      { status: 500 }
    );
  }
}
