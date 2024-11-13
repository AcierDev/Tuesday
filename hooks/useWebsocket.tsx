import {
  Alert,
  AnalysisResults,
  ConnectionStatus,
  EjectionSettings,
  LogEntry,
  State,
} from "@/typings/types";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

const WEBSOCKET_URL = "ws://192.168.1.215:3000/ws";
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_INTERVAL = 30000;

// Add new types for image handling
interface ImageMetadata {
  type: "image";
  filename: string;
  mimeType: string;
  timestamp: string;
  size: number;
}

interface ExtendedState extends State {
  currentImageUrl: string | null;
  currentImageMetadata: ImageMetadata | null;
  currentAnalysis: AnalysisResults | null;
}

const INITIAL_STATE: ExtendedState = {
  sensor1: false,
  sensor2: false,
  solenoid: false,
  ejection: false,
  lastPhotoPath: null,
  deviceConnected: false,
  lastUpdate: new Date(),
  currentImageUrl: null,
  currentImageMetadata: null,
  isCapturingImage: false,
  currentAnalysis: null,
  ejectionSettings: {
    globalSettings: {
      ejectionDuration: 1000,
      requireMultipleDefects: false,
      minTotalArea: 100,
      maxDefectsBeforeEject: 5,
    },
    perClassSettings: {
      corner: {
        enabled: true,
        minConfidence: 0.5,
        minArea: 0.001,
        maxCount: 3,
      },
      crack: { enabled: true, minConfidence: 0.5, minArea: 0.001, maxCount: 3 },
      damage: {
        enabled: true,
        minConfidence: 0.5,
        minArea: 0.001,
        maxCount: 3,
      },
      edge: { enabled: true, minConfidence: 0.5, minArea: 0.001, maxCount: 3 },
      knot: { enabled: true, minConfidence: 0.5, minArea: 0.001, maxCount: 3 },
      router: {
        enabled: true,
        minConfidence: 0.5,
        minArea: 0.001,
        maxCount: 3,
      },
      side: { enabled: true, minConfidence: 0.5, minArea: 0.001, maxCount: 3 },
      tearout: {
        enabled: true,
        minConfidence: 0.5,
        minArea: 0.001,
        maxCount: 3,
      },
    },
    advancedSettings: {
      considerOverlap: false,
      regionOfInterest: { x: 0, y: 0, width: 100, height: 100 },
    },
  },
};

export const useWebSocketManager = () => {
  const [state, setState] = useState<ExtendedState>({
    ...INITIAL_STATE,
    currentAnalysis: null,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const [connectionError, setConnectionError] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  const handleBinaryMessage = useCallback((blob: Blob) => {
    try {
      const url = URL.createObjectURL(blob);

      // Clean up previous URL if it exists
      setState((prev) => {
        if (prev.currentImageUrl) {
          URL.revokeObjectURL(prev.currentImageUrl);
        }
        return {
          ...prev,
          currentImageUrl: url,
          lastUpdate: new Date(),
        };
      });

      toast.success("Image captured successfully");
    } catch (error) {
      console.error("Error handling image blob:", error);
      toast.error("Failed to process image");
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current || isConnectingRef.current) {
      return;
    }

    try {
      isConnectingRef.current = true;
      setConnectionStatus("connecting");

      const ws = new WebSocket(WEBSOCKET_URL);
      ws.binaryType = "blob"; // Important for binary image data
      wsRef.current = ws;

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
        }
      }, 5000);

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close(1000, "Component unmounted");
          return;
        }
        clearTimeout(connectionTimeout);
        setConnectionStatus("connected");
        setReconnectAttempts(0);
        setConnectionError("");
        isConnectingRef.current = false;
        toast.success("Connected to system");
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          // Handle binary message (image data)
          if (event.data instanceof Blob) {
            handleBinaryMessage(event.data);
            return;
          }

          const eventData = JSON.parse(event.data);
          // console.log("raw data", eventData);

          if (!eventData.type && typeof eventData === "object") {
            setState((prev) => ({
              ...prev,
              ...eventData,
              lastUpdate: new Date(),
            }));
            return;
          }

          switch (eventData.type) {
            case "imageMetadata": {
              setState((prev) => ({
                ...prev,
                currentImageMetadata: eventData.data,
                lastUpdate: new Date(),
                currentAnalysis: null,
              }));
              break;
            }
            case "stateUpdate": {
              setState((prev) => ({
                ...prev,
                ...eventData.data,
                lastUpdate: new Date(),
              }));
              break;
            }
            case "ejectionSettings": {
              setState((prev) => ({
                ...prev,
                ejectionSettings: eventData.data as EjectionSettings,
                lastUpdate: new Date(),
              }));
              break;
            }
            case "systemLog": {
              setLogs((prev) => [
                {
                  id: crypto.randomUUID(),
                  timestamp: new Date(),
                  level: eventData.level || "info",
                  message: eventData.data.message,
                  source: eventData.source || "system",
                },
                ...prev,
              ]);
              break;
            }
            case "alert": {
              const newAlert = {
                id: crypto.randomUUID(),
                timestamp: new Date(),
                level: eventData.level || "warning",
                message: eventData.data.message,
                acknowledged: false,
              };
              setAlerts((prev) => [newAlert, ...prev]);

              // Show toast for new alerts
              if (eventData.level === "error") {
                toast.error(eventData.data.message);
              } else {
                toast.warning(eventData.data.message);
              }
              break;
            }
            case "analysisResults": {
              setState((prev) => ({
                ...prev,
                currentAnalysis: eventData.data as AnalysisResults,
                lastUpdate: new Date(),
              }));
              break;
            }
            case "ejectionSettingsError": {
              toast.error(
                `Failed to update ejection settings: ${eventData.message}`
              );
              // Rollback to last known good state from server
              if (eventData.currentSettings) {
                setState((prev) => ({
                  ...prev,
                  ejectionSettings: eventData.currentSettings,
                  lastUpdate: new Date(),
                }));
              }
              break;
            }
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };

      ws.onclose = (event: CloseEvent) => {
        clearTimeout(connectionTimeout);

        if (!mountedRef.current) return;

        setConnectionStatus("disconnected");
        isConnectingRef.current = false;
        toast.error("Disconnected from system");

        if (event.code !== 1000 && event.code !== 1005) {
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                setReconnectAttempts((prev) => prev + 1);
                connect();
              }
            }, RECONNECT_DELAY);
          } else {
            setConnectionError(
              "Maximum reconnection attempts reached. Please refresh the page."
            );
          }
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setConnectionStatus("disconnected");
        isConnectingRef.current = false;
      };
    } catch (error) {
      if (!mountedRef.current) return;
      setConnectionError(
        "Failed to establish WebSocket connection. Please check your network connection."
      );
      isConnectingRef.current = false;
    }
  }, [reconnectAttempts, handleBinaryMessage]);

  const updateEjectionSettings = useCallback(
    (newSettings: EjectionSettings) => {
      console.log("Updating ejection settings via websocket");
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "updateEjectionSettings",
            data: newSettings,
          })
        );

        setState((prev) => ({
          ...prev,
          ejectionSettings: newSettings,
          lastUpdate: new Date(),
        }));

        toast.success("Ejection settings updated");
      } else {
        toast.error("Cannot update settings: WebSocket not connected");
      }
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      isConnectingRef.current = false;

      // Clean up image URLs
      setState((prev) => {
        if (prev.currentImageUrl) {
          URL.revokeObjectURL(prev.currentImageUrl);
        }
        return prev;
      });

      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
        wsRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  return {
    status: state,
    logs,
    alerts,
    connectionStatus,
    connectionError,
    reconnectAttempts,
    updateEjectionSettings,
  };
};
