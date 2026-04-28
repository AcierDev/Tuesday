import { getDb } from "../../db/connect";
import { Item } from "@/typings/types";

const HEARTBEAT_INTERVAL_MS = 25_000;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isActive = true;
      let changeStream: any;
      let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

      const safeEnqueue = (chunk: string): boolean => {
        if (!isActive) return false;
        try {
          controller.enqueue(encoder.encode(chunk));
          return true;
        } catch {
          isActive = false;
          return false;
        }
      };

      const cleanup = async () => {
        if (!isActive) return;
        isActive = false;
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (changeStream) {
          try {
            await changeStream.close();
          } catch {
            // ignore
          }
        }
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      // Close the stream when the client disconnects
      request.signal.addEventListener("abort", () => {
        void cleanup();
      });

      // Initial comment so the client knows the stream is open
      safeEnqueue(`: connected\n\n`);

      // Periodic heartbeat keeps the connection alive against proxy/browser idle timeouts
      heartbeatTimer = setInterval(() => {
        if (!safeEnqueue(`: heartbeat\n\n`)) {
          void cleanup();
        }
      }, HEARTBEAT_INTERVAL_MS);

      try {
        const db = await getDb();
        const collection = db.collection<Item>(
          `items-${process.env.NEXT_PUBLIC_MODE}`
        );

        changeStream = collection.watch();

        for await (const change of changeStream) {
          if (!isActive) break;

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

              if (!safeEnqueue(`data: ${message}\n\n`)) break;
            } catch (findError) {
              console.error("Error fetching updated item:", findError);
              continue;
            }
          }
        }
      } catch (error) {
        console.error("Change stream error:", error);
      } finally {
        await cleanup();
      }
    },
    async cancel() {
      // Abort handler in start() takes care of cleanup; this is a no-op fallback.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
