// hooks/useBoardWatch.ts
import { useEffect } from "react";
import { Board } from "@/typings/types";
import { toast } from "sonner";

export function useBoardWatch(
  boardId: string | undefined,
  onBoardUpdate: (board: Board) => void
) {
  useEffect(() => {
    if (!boardId) return;

    let eventSource: EventSource;
    let isConnected = false;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const baseDelay = 1000; // Start with 1 second delay

    function connect() {
      if (isConnected || reconnectAttempts >= maxReconnectAttempts) return;

      eventSource = new EventSource("/api/board/watch");

      eventSource.onopen = () => {
        console.log("SSE connection established");
        isConnected = true;
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "update" && data.document?.id === boardId) {
            onBoardUpdate(data.document);
            toast.success("Board updated", {
              style: { background: "#10B981", color: "white" },
            });
          }
        } catch (error) {
          console.error("Error processing SSE message:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        eventSource.close();
        isConnected = false;

        // Implement exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(2, reconnectAttempts),
          30000
        );
        reconnectAttempts++;

        if (reconnectAttempts < maxReconnectAttempts) {
          console.log(
            `Reconnecting in ${delay}ms... (Attempt ${reconnectAttempts})`
          );
          setTimeout(connect, delay);
        } else {
          toast.error(
            "Failed to maintain live updates. Please refresh the page.",
            {
              style: { background: "#EF4444", color: "white" },
            }
          );
        }
      };
    }

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
        isConnected = false;
      }
    };
  }, [boardId, onBoardUpdate]);
}
