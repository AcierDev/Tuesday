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

        try {
          changeStream = collection.watch();

          // Handle each change
          for await (const change of changeStream) {
            if (change.operationType === "update") {
              const board = await collection.findOne({
                _id: change.documentKey._id,
              });

              if (board) {
                const message = JSON.stringify({
                  type: "update",
                  boardId: board.id,
                  board,
                });

                controller.enqueue(`data: ${message}\n\n`);
              }
            }
          }
        } catch (error) {
          console.error("Change stream error:", error);
          controller.close();
        } finally {
          // Clean up the change stream
          if (changeStream) {
            await changeStream.close();
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
