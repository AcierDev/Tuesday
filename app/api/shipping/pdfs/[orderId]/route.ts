import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`http://144.172.71.72:3003/pdfs/${orderId}`);

    if (!response.ok) {
      throw new Error(`PDF service returned status: ${response.status}`);
    }

    const data = await response.json();

    // Ensure we're returning an array
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error(`Failed to fetch PDFs for order ${orderId}:`, error);
    return NextResponse.json(
      {
        error: "Failed to fetch PDFs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
