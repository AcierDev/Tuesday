import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(`http://144.172.71.72:3003/pdfs`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch PDFs" },
      { status: 500 }
    );
  }
}
