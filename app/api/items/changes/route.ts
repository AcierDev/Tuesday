import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getDb } from "../../db/connect";
import { Item } from "@/typings/types";

export async function GET() {
  const headersList = headers();

  // Set up SSE headers
  const response = new Response(
    new ReadableStream({
      async start(controller) {
        const db = await getDb();
        const collection = db.collection<Item>(
          `items-${process.env.NEXT_PUBLIC_MODE}`
        );

        let changeStream: any;
        let isConnectionActive = true;

        // Add cleanup function
        const cleanup = async () => {
          isConnectionActive = false;
          if (changeStream) {
            try {
              await changeStream.close();
            } catch (error) {
              console.error("Error closing change stream:", error);
            }
          }
          try {
            controller.close();
          } catch (closeError) {
            // Controller might already be closed, ignore the error
          }
        };

        try {
          changeStream = collection.watch();

          // Handle each change
          for await (const change of changeStream) {
            if (!isConnectionActive) break;

            if (
              change.operationType === "update" ||
              change.operationType === "insert" ||
              change.operationType === "delete"
            ) {
              try {
                const item = await collection.findOne({
                  _id: change.documentKey._id,
                });

                const message = JSON.stringify({
                  type: change.operationType,
                  itemId: item?.id,
                  item: item || null,
                });

                try {
                  controller.enqueue(`data: ${message}\n\n`);
                } catch (enqueueError) {
                  await cleanup();
                  break;
                }
              } catch (findError) {
                console.error("Error fetching updated item:", findError);
                continue;
              }
            }
          }
        } catch (error) {
          console.error("Change stream error:", error);
          await cleanup();
        }
      },
      cancel() {},
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  );

  return response;
}
