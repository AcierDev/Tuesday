import { getDb } from "../../db/connect";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🛰️ SSE: PUSH SHARED-SETTINGS CHANGES TO ALL BROWSERS                  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// Settings used to propagate via a 3-second poll. Item changes propagate via
// SSE in ~100ms. When a user changed onDeckMinCount, the slow-settings vs
// fast-items mismatch let other browsers run useAutoPromoteByDueDate against
// a stale minCount, demoting items the originating browser had just promoted
// — items would visibly thrash for the full polling window. This stream
// closes that gap by pushing shared settings on the same timescale as items.

const SETTINGS_COLLECTION = "settings";
const GLOBAL_SETTINGS_ID = "global";
const HEARTBEAT_INTERVAL_MS = 25_000;

type SharedSettings = {
  _id: string;
  dueBadgeDays?: number;
  onDeckMinCount?: number;
};

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

      request.signal.addEventListener("abort", () => {
        void cleanup();
      });

      safeEnqueue(`: connected\n\n`);

      heartbeatTimer = setInterval(() => {
        if (!safeEnqueue(`: heartbeat\n\n`)) {
          void cleanup();
        }
      }, HEARTBEAT_INTERVAL_MS);

      try {
        const db = await getDb();
        const collection = db.collection<SharedSettings>(SETTINGS_COLLECTION);

        changeStream = collection.watch([
          { $match: { "documentKey._id": GLOBAL_SETTINGS_ID } },
        ]);

        for await (const change of changeStream) {
          if (!isActive) break;

          if (
            change.operationType === "update" ||
            change.operationType === "insert" ||
            change.operationType === "replace"
          ) {
            try {
              const doc = await collection.findOne({ _id: GLOBAL_SETTINGS_ID });
              if (!doc) continue;

              const payload: Record<string, unknown> = {};
              if (typeof doc.dueBadgeDays === "number") {
                payload.dueBadgeDays = doc.dueBadgeDays;
              }
              if (typeof doc.onDeckMinCount === "number") {
                payload.onDeckMinCount = doc.onDeckMinCount;
              }
              if (Object.keys(payload).length === 0) continue;

              if (!safeEnqueue(`data: ${JSON.stringify(payload)}\n\n`)) break;
            } catch (findError) {
              console.error("Error fetching updated settings:", findError);
              continue;
            }
          }
        }
      } catch (error) {
        console.error("Settings change stream error:", error);
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
