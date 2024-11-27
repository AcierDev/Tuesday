import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

interface WebcamFeedProps {
  wsConnected: boolean;
  sendCommand: (command: { type: string; payload?: any }) => void;
}

const WebcamFeed: React.FC<WebcamFeedProps> = ({
  wsConnected,
  sendCommand,
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [frameData, setFrameData] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [lastFrameTime, setLastFrameTime] = useState<Date | null>(null);

  useEffect(() => {
    // Reset streaming state when websocket disconnects
    if (!wsConnected) {
      console.log(
        "[WebcamFeed] WebSocket disconnected, resetting stream state"
      );
      setIsStreaming(false);
      setFrameData(null);
      setFrameCount(0);
      setLastFrameTime(null);
    }
  }, [wsConnected]);

  useEffect(() => {
    const handleWebcamFrame = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        console.log("[WebcamFeed] Received message type:", message.type);

        if (message.type === "WEBCAM_FRAME") {
          console.log(
            "[WebcamFeed] Frame received:",
            "Size:",
            message.payload?.data?.length ?? 0,
            "bytes",
            "Timestamp:",
            message.payload?.timestamp ?? "none"
          );

          if (message.payload?.data) {
            setFrameData(`data:image/jpeg;base64,${message.payload.data}`);
            setFrameCount((prev) => prev + 1);
            setLastFrameTime(new Date());
          } else {
            console.warn("[WebcamFeed] Received frame without data");
          }
        }
      } catch (error) {
        console.error("[WebcamFeed] Error handling webcam frame:", error);
        if (error instanceof Error) {
          console.error("[WebcamFeed] Error details:", error.message);
        }
      }
    };

    console.log(
      "[WebcamFeed] Setting up message listener, connected:",
      wsConnected
    );
    if (wsConnected) {
      // Important: Use the correct event source
      window.addEventListener("message", handleWebcamFrame);
    }

    return () => {
      console.log("[WebcamFeed] Cleaning up message listener");
      window.removeEventListener("message", handleWebcamFrame);
    };
  }, [wsConnected]);

  const toggleStream = () => {
    if (isStreaming) {
      console.log("[WebcamFeed] Stopping stream");
      sendCommand({ type: "STOP_WEBCAM" });
      setIsStreaming(false);
      setFrameData(null);
      setFrameCount(0);
      setLastFrameTime(null);
    } else {
      console.log("[WebcamFeed] Starting stream");
      sendCommand({ type: "START_WEBCAM" });
      setIsStreaming(true);
    }
  };

  // Log stream statistics periodically
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        console.log("[WebcamFeed] Stream stats:", {
          totalFrames: frameCount,
          lastFrameReceived: lastFrameTime
            ? lastFrameTime.toISOString()
            : "never",
          timeSinceLastFrame: lastFrameTime
            ? `${(new Date().getTime() - lastFrameTime.getTime()) / 1000}s ago`
            : "n/a",
        });
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isStreaming, frameCount, lastFrameTime]);

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">
          Live Camera Feed {frameCount > 0 && `(${frameCount} frames received)`}
        </CardTitle>
        <Button
          onClick={toggleStream}
          disabled={!wsConnected}
          variant={isStreaming ? "destructive" : "default"}
          size="sm"
          className="flex items-center gap-2"
        >
          {isStreaming ? (
            <>
              <CameraOff className="h-4 w-4" />
              Stop Feed
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              Start Feed
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
          {frameData ? (
            <img
              src={frameData}
              alt="Live feed"
              className="w-full h-full object-contain"
              onError={(e) => {
                console.error("[WebcamFeed] Error loading image:", e);
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <Camera className="h-12 w-12" />
            </div>
          )}
        </div>
        {lastFrameTime && (
          <div className="mt-2 text-sm text-gray-500 text-center">
            Last frame: {new Date().getTime() - lastFrameTime.getTime()}ms ago
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WebcamFeed;
