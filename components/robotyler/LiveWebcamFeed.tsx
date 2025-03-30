import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, WifiOff, RefreshCw, Maximize2 } from "lucide-react";
import ComputerSelector from "./ComputerSelector";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface LiveCameraFeedProps {
  initialWsIp?: string;
  retryInterval?: number;
  className?: string;
}

const LiveCameraFeed: React.FC<LiveCameraFeedProps> = ({
  initialWsIp = "localhost:3090",
  retryInterval = 3000,
  className = "",
}) => {
  const [imageData, setImageData] = useState<string | null>(null);
  const [wsIp, setWsIp] = useState(initialWsIp);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastSuccessfulConnection, setLastSuccessfulConnection] = useState<
    string | null
  >(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionStatus("connecting");
    setError(null);

    try {
      const ws = new WebSocket(`ws://${wsIp}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected to:", wsIp);
        setConnectionStatus("connected");
        setError(null);
        setLastSuccessfulConnection(wsIp);
      };

      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "pong") {
            return; // Handle pong response
          }

          if (message.type === "frame" && message.data) {
            const img = new Image();
            img.onload = () => {
              setImageData(`data:image/jpeg;base64,${message.data}`);
              setError(null);
            };
            img.onerror = () => {
              setError("Invalid image data received");
            };
            img.src = `data:image/jpeg;base64,${message.data}`;
          }
        } catch (err) {
          console.error("WebSocket message error:", err);
          setError("Failed to process video frame");
        }
      };

      ws.onclose = () => {
        clearInterval(pingInterval);
        setConnectionStatus("disconnected");

        if (wsRef.current === ws) {
          setError("Connection closed. Retrying...");
          reconnectTimeoutRef.current = setTimeout(
            connectWebSocket,
            retryInterval
          );
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        ws.close();
      };

      return () => clearInterval(pingInterval);
    } catch (err) {
      console.error("WebSocket connection error:", err);
      setError("Failed to create connection");
      setConnectionStatus("disconnected");
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, retryInterval);
    }
  }, [wsIp, retryInterval]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <>
      <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
        <CardHeader className="pb-3 flex-none">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <div className="flex items-center">
              <Video className="mr-2 h-5 w-5 text-blue-500" />
              Live Camera Feed 4da boiz
              {connectionStatus === "connected" && (
                <span className="ml-2 text-xs text-gray-500">
                  {imageData
                    ? "Receiving frames"
                    : "Waiting for first frame..."}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Maximize2 className="h-5 w-5" />
            </Button>
          </CardTitle>
          <ComputerSelector
            onSelect={setWsIp}
            computers={[
              { name: "RoboTyler Raspi", ip: "192.168.1.197:3090" },
              { name: "Dev Testing Raspi", ip: "192.168.1.216:3090" },
              { name: "Bentzi's Laptop", ip: "192.168.1.229:3090" },
              { name: "localhost", ip: "localhost:3090" },
            ]}
            initialIp={lastSuccessfulConnection || initialWsIp}
          />
        </CardHeader>
        <CardContent className="flex-1 p-0">
          {imageData && connectionStatus === "connected" ? (
            <img
              src={imageData}
              alt="Live Camera Feed"
              className="w-full h-full object-cover rounded-lg"
              onError={() => setError("Failed to display image")}
            />
          ) : (
            <div className="w-full h-full min-h-[400px] bg-gray-200 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center">
              {connectionStatus === "connecting" ? (
                <p className="text-yellow-500 dark:text-yellow-400">
                  Connecting to camera feed...
                </p>
              ) : connectionStatus === "disconnected" ? (
                <>
                  <WifiOff className="h-12 w-12 text-red-500 mb-2" />
                  <p className="text-red-500 dark:text-red-400">
                    Connection failed
                  </p>
                  {error && (
                    <p className="text-sm text-red-400 dark:text-red-300 mt-2">
                      {error}
                    </p>
                  )}
                  <Button
                    onClick={connectWebSocket}
                    className="mt-4 bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reconnect
                  </Button>
                </>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  Waiting for video feed...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-full w-[90vw] h-[90vh] p-0">
          {imageData && connectionStatus === "connected" ? (
            <img
              src={imageData}
              alt="Live Camera Feed"
              className="w-full h-full object-contain"
              onError={() => setError("Failed to display image")}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex flex-col items-center justify-center">
              <p className="text-xl text-gray-500 dark:text-gray-400">
                No video feed available
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LiveCameraFeed;
