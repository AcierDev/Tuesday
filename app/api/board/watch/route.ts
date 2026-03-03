import { NextRequest } from "next/server";
import { Board } from "@/typings/types";
import { ChangeStream } from "mongodb";
import process from "node:process";
import clientPromise from "../../db/connect";

const RETRY_INTERVAL = 5000; // 5 seconds
const MAX_AWAIT_TIME = 30000; // 30 seconds
const MAX_RETRIES = 3;

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let changeStream: ChangeStream | null = null;
  let client;
  let retryCount = 0;

  try {
    client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Board>(process.env.NEXT_PUBLIC_MODE!);

    // Create a change stream with a resume token
    changeStream = collection.watch([], {
      fullDocument: "updateLookup",
      maxAwaitTimeMS: MAX_AWAIT_TIME,
    });

    // Create and return a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        let isControllerActive = true;

        // Helper function to safely send events
        const sendEvent = (data: any) => {
          try {
            if (isControllerActive) {
              const formattedData = `data: ${JSON.stringify(data)}\n\n`;
              controller.enqueue(encoder.encode(formattedData));
            }
          } catch (error) {
            console.error("Error sending event:", error);
            // If we can't send events, consider the controller inactive
            isControllerActive = false;
          }
        };

        // Function to create a new change stream
        const createChangeStream = async (resumeToken: any = null) => {
          if (changeStream) {
            await changeStream.close().catch(console.error);
          }

          changeStream = collection.watch([], {
            fullDocument: "updateLookup",
            maxAwaitTimeMS: MAX_AWAIT_TIME,
            resumeAfter: resumeToken,
          });

          return changeStream;
        };

        try {
          // Send initial connection message
          sendEvent({ type: "connected" });

          // Keep track of the last resume token
          let resumeToken = null;

          while (isControllerActive) {
            try {
              if (!changeStream) {
                throw new Error("Change stream is null");
              }

              // Wait for the next change
              const change = await changeStream.next();

              // Reset retry count on successful change
              retryCount = 0;

              if (!change) {
                continue;
              }

              // Update resume token
              resumeToken = change._id;

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
            } catch (error: any) {
              console.error("Change stream iteration error:", error);

              // Check if we've exceeded max retries
              if (retryCount >= MAX_RETRIES) {
                throw new Error("Max retry attempts exceeded");
              }

              // Increment retry count
              retryCount++;

              // Handle specific error cases
              if (
                error.message.includes("ChangeStream is closed") ||
                error.name === "MongoNetworkError"
              ) {
                console.log(`Attempting to reconnect (attempt ${retryCount})`);

                // Wait before attempting to reconnect
                await new Promise((resolve) =>
                  setTimeout(resolve, RETRY_INTERVAL)
                );

                // Try to recreate the change stream
                changeStream = await createChangeStream(resumeToken);

                // Send reconnection message
                sendEvent({ type: "reconnected", attempt: retryCount });
                continue;
              }

              // For other errors, throw them to be handled by the outer try-catch
              throw error;
            }
          }
        } catch (error) {
          console.error("Fatal change stream error:", error);

          // Only try to close the controller if it's still active
          if (isControllerActive) {
            isControllerActive = false;
            controller.error(error);
          }
        }
      },
      async cancel() {
        // Clean up the change stream when the client disconnects
        if (changeStream) {
          try {
            await changeStream.close();
          } catch (error) {
            console.error("Error closing change stream:", error);
          }
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
    // Clean up resources
    if (changeStream) {
      await changeStream.close().catch(console.error);
    }
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
