// app/api/board/watch/route.ts
import { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Board } from "@/typings/types";
import { ChangeStream } from "mongodb";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let changeStream: ChangeStream | null = null;

  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Board>(process.env.NEXT_PUBLIC_MODE!);

    // Create a change stream
    changeStream = collection.watch([], {
      fullDocument: "updateLookup",
    });

    // Create and return a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Helper function to send events
          const sendEvent = (data: any) => {
            const formattedData = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(formattedData));
          };

          if (!changeStream) return;

          // Watch for changes
          for await (const change of changeStream) {
            switch (change.operationType) {
              case "insert":
              case "update":
              case "replace":
                sendEvent({
                  type: change.operationType,
                  documentId: change.documentKey._id,
                  document: change.fullDocument,
                });
                break;
              case "delete":
                sendEvent({
                  type: "delete",
                  documentId: change.documentKey._id,
                });
                break;
            }
          }
        } catch (error) {
          console.error("Change stream error:", error);
          controller.error(error);
        }
      },
      cancel() {
        // Clean up the change stream when the client disconnects
        if (changeStream) {
          changeStream.close().catch(console.error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Failed to establish change stream:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
