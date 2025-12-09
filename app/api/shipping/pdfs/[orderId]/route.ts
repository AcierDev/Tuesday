import { NextResponse } from "next/server";
import { listLabelsForOrder } from "@/lib/s3-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  try {
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const labels = await listLabelsForOrder(orderId);
    return NextResponse.json(labels);
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
