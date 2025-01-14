import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/api/db/connect";
import { ColumnValue, Item } from "@/typings/types";

export async function POST(request: Request) {
  try {
    const db = await connectToDatabase();
    const board = await db
      .collection(`${process.env.NEXT_PUBLIC_APP_URL}/board`)
      .findOne();

    const orders =
      board?.items_page?.items?.filter((item: Item) =>
        item.values?.some(
          (value: ColumnValue) =>
            value.columnName === "Labels" && value.text === "true"
        )
      ) || [];

    const results = {
      total: orders.length,
      processed: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const order of orders) {
      try {
        // Get list of PDFs for this order
        const pdfListResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/shipping/pdfs/${order._id}`,
          { method: "GET" }
        );

        if (!pdfListResponse.ok) {
          throw new Error(`Failed to get PDF list for order ${order._id}`);
        }

        const pdfList = await pdfListResponse.json();

        for (const pdfName of pdfList) {
          // Get the actual PDF file
          const pdfResponse = await fetch(`/api/shipping/pdf/${pdfName}`, {
            method: "GET",
          });

          if (!pdfResponse.ok) {
            throw new Error(
              `Failed to get PDF ${pdfName} for order ${order._id}`
            );
          }

          const pdfBlob = await pdfResponse.blob();

          // Extract tracking info
          const formData = new FormData();
          formData.append("label", pdfBlob, pdfName);

          const extractResponse = await fetch(
            `/api/shipping/extract-tracking`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!extractResponse.ok) {
            throw new Error(
              `Failed to extract tracking info for order ${order._id}`
            );
          }

          const trackingInfo = await extractResponse.json();

          // Get tracker info
          const trackerResponse = await fetch(
            `/api/shipping/tracker/${trackingInfo.trackingNumber}?carrier=${trackingInfo.carrier}`,
            { method: "GET" }
          );

          if (!trackerResponse.ok) {
            throw new Error(
              `Failed to get tracker info for order ${order._id}`
            );
          }

          const tracker = await trackerResponse.json();

          // Save tracking info
          await fetch(`/api/order-tracking`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order._id.toString(),
              trackers: [tracker],
            }),
          });

          results.processed++;
          results.details.push({
            orderId: order._id.toString(),
            status: "success",
            tracking: trackingInfo.trackingNumber,
            carrier: trackingInfo.carrier,
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          orderId: order._id.toString(),
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Add delay to prevent overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Failed to process existing orders:", error);
    return NextResponse.json(
      { error: "Failed to process existing orders" },
      { status: 500 }
    );
  }
}
