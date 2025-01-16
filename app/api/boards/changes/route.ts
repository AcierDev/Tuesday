import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getDb } from "../../db/connect";
import { Board } from "@/typings/types";

export async function GET() {
  const headersList = headers();

  // Set up SSE headers
  const response = new Response(
    new ReadableStream({
      async start(controller) {
        const db = await getDb();
        const collection = db.collection<Board>(`${process.env.NODE_ENV}`);

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

            if (change.operationType === "update") {
              try {
                const board = await collection.findOne({
                  _id: change.documentKey._id,
                });

                if (board) {
                  const message = JSON.stringify({
                    type: "update",
                    boardId: board.id,
                    board,
                  });

                  try {
                    controller.enqueue(`data: ${message}\n\n`);
                  } catch (enqueueError) {
                    await cleanup();
                    break;
                  }
                }
              } catch (findError) {
                console.error("Error fetching updated board:", findError);
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
