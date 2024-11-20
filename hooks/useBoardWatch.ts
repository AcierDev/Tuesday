import { useEffect, useCallback, useRef } from "react";
import { Board } from "@/typings/types";
import { toast } from "sonner";

interface BoardWatchOptions {
  onBoardUpdate: (board: Board) => void;
  onConnectionChange?: (
    status: "connected" | "disconnected" | "reconnecting"
  ) => void;
  maxReconnectAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export function useBoardWatch(
  boardId: string | undefined,
  {
    onBoardUpdate,
    onConnectionChange,
    maxReconnectAttempts = 5,
    baseDelay = 1000,
    maxDelay = 30000,
  }: BoardWatchOptions
) {
  // Use refs to maintain latest values in event listeners
  const connStateRef = useRef({
    isConnected: false,
    reconnectAttempts: 0,
    eventSource: null as EventSource | null,
    reconnectTimeout: null as NodeJS.Timeout | null,
  });

  // Clear any existing reconnection timeout
  const clearReconnectTimeout = useCallback(() => {
    if (connStateRef.current.reconnectTimeout) {
      clearTimeout(connStateRef.current.reconnectTimeout);
      connStateRef.current.reconnectTimeout = null;
    }
  }, []);

  // Clean up resources
  const cleanup = useCallback(() => {
    clearReconnectTimeout();
    if (connStateRef.current.eventSource) {
      connStateRef.current.eventSource.close();
      connStateRef.current.eventSource = null;
    }
    connStateRef.current.isConnected = false;
  }, [clearReconnectTimeout]);

  // Connect to EventSource
  const connect = useCallback(() => {
    if (
      !boardId ||
      connStateRef.current.isConnected ||
      connStateRef.current.reconnectAttempts >= maxReconnectAttempts
    ) {
      return;
    }

    cleanup();

    const eventSource = new EventSource("/api/board/watch");
    connStateRef.current.eventSource = eventSource;

    eventSource.onopen = () => {
      console.log("SSE connection established");
      connStateRef.current.isConnected = true;
      connStateRef.current.reconnectAttempts = 0;
      onConnectionChange?.("connected");

      // Clear any pending reconnection timeouts
      clearReconnectTimeout();
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "connected":
            console.log("Initial connection established");
            break;

          case "reconnected":
            console.log(`Server reconnected (attempt ${data.attempt})`);
            toast.success("Live updates restored", {
              style: { background: "#10B981", color: "white" },
            });
            break;

          case "update":
          case "replace":
            if (data.document?.id === boardId) {
              onBoardUpdate(data.document);
              toast.success("Board updated", {
                style: { background: "#10B981", color: "white" },
              });
            }
            break;

          case "delete":
            if (data.documentId === boardId) {
              toast.error("Board has been deleted", {
                style: { background: "#EF4444", color: "white" },
              });
              // You might want to handle board deletion here
              // e.g., redirect to homepage
            }
            break;
        }
      } catch (error) {
        console.error("Error processing SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);

      // Close existing connection
      cleanup();

      onConnectionChange?.("disconnected");

      // Implement exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(2, connStateRef.current.reconnectAttempts),
        maxDelay
      );

      connStateRef.current.reconnectAttempts++;

      if (connStateRef.current.reconnectAttempts < maxReconnectAttempts) {
        console.log(
          `Reconnecting in ${delay}ms... (Attempt ${connStateRef.current.reconnectAttempts})`
        );

        onConnectionChange?.("reconnecting");

        // Store timeout reference for cleanup
        connStateRef.current.reconnectTimeout = setTimeout(connect, delay);
      } else {
        toast.error(
          "Failed to maintain live updates. Please refresh the page.",
          {
            style: { background: "#EF4444", color: "white" },
          }
        );
      }
    };
  }, [
    boardId,
    onBoardUpdate,
    onConnectionChange,
    maxReconnectAttempts,
    baseDelay,
    maxDelay,
    cleanup,
    clearReconnectTimeout,
  ]);

  useEffect(() => {
    if (!boardId) return;

    connect();

    return cleanup;
  }, [boardId, connect, cleanup]);
}
