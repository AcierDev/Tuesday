import { subscribeToItemChanges } from "./item-change-hub";

const HEARTBEAT_INTERVAL_MS = 25_000;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let closeConnection = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let isActive = true;
      let unsubscribe: (() => void) | null = null;
      let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

      const close = () => {
        if (!isActive) return;
        isActive = false;
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        unsubscribe?.();
        request.signal.removeEventListener("abort", close);
        try {
          controller.close();
        } catch {
          // Already closed by the client disconnecting.
        }
      };
      closeConnection = close;

      const send = (chunk: string) => {
        if (!isActive) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          close();
        }
      };

      // Initial comment so the client knows the stream is open
      send(`: connected\n\n`);

      // Periodic heartbeat keeps the connection alive against proxy/browser idle timeouts
      heartbeatTimer = setInterval(() => send(`: heartbeat\n\n`), HEARTBEAT_INTERVAL_MS);

      // All connections share one change stream; this one only listens.
      unsubscribe = subscribeToItemChanges({
        onChange: (message) => send(`data: ${JSON.stringify(message)}\n\n`),
        onClose: close,
      });
      if (!isActive) unsubscribe();

      request.signal.addEventListener("abort", close);
      if (request.signal.aborted) close();
    },
    // Runs when the client disconnects (a cleanup returned from start() is ignored).
    cancel() {
      closeConnection();
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
