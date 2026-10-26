import type { ChangeStream } from "mongodb";

import { getDb } from "@/app/api/db/connect";
import { projectOrderTrackingSummary } from "@/lib/shipping-labels/tracker-summary";
import type { OrderTrackingInfo } from "@/typings/types";

// Authenticated live tracker stream for the orders page (site-access cookie is
// enforced by middleware). Watching the collection covers webhook updates,
// purchases and uploads, whichever server process wrote them.
const HEARTBEAT_INTERVAL_MS = 25_000;
const WATCHED_OPERATIONS = ["insert", "update", "replace"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let cleanup: () => Promise<void> = async () => undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let isActive = true;
      let changeStream: ChangeStream<OrderTrackingInfo> | undefined;
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

      cleanup = async () => {
        if (!isActive && !changeStream && !heartbeatTimer) return;
        isActive = false;
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = undefined;
        const openStream = changeStream;
        changeStream = undefined;
        if (openStream) {
          try {
            await openStream.close();
          } catch {
            // already closed
          }
        }
        try {
          controller.close();
        } catch {
          // already closed or cancelled
        }
      };

      request.signal.addEventListener("abort", () => {
        void cleanup();
      });

      safeEnqueue(`: connected\n\n`);
      heartbeatTimer = setInterval(() => {
        if (!safeEnqueue(`: heartbeat\n\n`)) void cleanup();
      }, HEARTBEAT_INTERVAL_MS);

      try {
        const db = await getDb();
        if (!isActive) return;
        changeStream = db
          .collection<OrderTrackingInfo>(`trackers-${process.env.NEXT_PUBLIC_MODE}`)
          .watch<OrderTrackingInfo>(
            [{ $match: { operationType: { $in: WATCHED_OPERATIONS } } }],
            { fullDocument: "updateLookup" }
          );

        for await (const change of changeStream) {
          if (!isActive) break;
          const document =
            "fullDocument" in change ? change.fullDocument : undefined;
          if (!document?.orderId) continue;
          const message = JSON.stringify({
            type: "tracking.updated",
            data: projectOrderTrackingSummary(document),
          });
          if (!safeEnqueue(`data: ${message}\n\n`)) break;
        }
      } catch (error) {
        if (isActive) console.error("Tracking change stream error:", error);
      } finally {
        await cleanup();
      }
    },
    async cancel() {
      // The browser went away: stop the heartbeat and close the change stream.
      await cleanup();
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
