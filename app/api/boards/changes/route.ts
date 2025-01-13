import { NextResponse } from "next/server";
import { headers } from "next/headers";
import clientPromise from "../../db/connect";
import { Board } from "@/typings/types";

export async function GET() {
  const headersList = headers();

  // Set up SSE headers
  const response = new Response(
    new ReadableStream({
      async start(controller) {
        const client = await clientPromise;
        const db = client.db("react-web-app");
        const collection = db.collection<Board>(`${process.env.NODE_ENV}`);

        let changeStream: any;
        let isConnectionActive = true;

        try {
          changeStream = collection.watch();

          // Handle each change
          for await (const change of changeStream) {
            // Check if the connection is still active before sending data
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

                  // Wrap the enqueue in a try-catch to handle closed controller
                  try {
                    controller.enqueue(`data: ${message}\n\n`);
                  } catch (enqueueError) {
                    console.log(
                      "Failed to send message, connection might be closed"
                    );
                    isConnectionActive = false;
                    break;
                  }
                }
              } catch (findError) {
                console.error("Error fetching updated board:", findError);
                // Continue watching for other changes even if one update fails
                continue;
              }
            }
          }
        } catch (error) {
          console.error("Change stream error:", error);
          isConnectionActive = false;
        } finally {
          // Clean up the change stream
          if (changeStream) {
            await changeStream.close();
          }
          // Ensure controller is closed if not already
          try {
            controller.close();
          } catch (closeError) {
            // Controller might already be closed, ignore the error
          }
        }
      },
      cancel() {
        // This will be called when the client disconnects
        console.log("Client disconnected");
      },
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
