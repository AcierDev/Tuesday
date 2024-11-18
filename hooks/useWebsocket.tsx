import {
  Alert,
  AnalysisResults,
  ConnectionStatus,
  RouterSettings,
  LogEntry,
  SystemState,
} from "@/typings/types";
import { generateUUID } from "@/utils/functions";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { DEFAULT_ROUTER_SETTINGS } from "@/utils/constants";

const WEBSOCKET_URL = "wss://192.168.1.215:3000/ws";
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

interface ExtendedState extends SystemState {
  currentImageUrl: string | null;
  currentImageMetadata: ImageMetadata | null;
  currentAnalysis: AnalysisResults | null;
  settings: RouterSettings;
}

const INITIAL_STATE: ExtendedState = {
  sensor1: { pin: 0, active: false },
  piston: { pin: 0, active: false },
  ejector: { pin: 0, active: false },
  riser: { pin: 0, active: false },
  lastPhotoPath: null,
  deviceConnected: false,
  lastUpdate: new Date(),
  currentImageUrl: null,
  currentImageMetadata: null,
  isCapturingImage: false,
  currentAnalysis: null,
  isProcessing: false,
  settings: DEFAULT_ROUTER_SETTINGS,
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
  const isConnectingRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateEjectionSettings = useCallback((newSettings: RouterSettings) => {
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
  }, []);

  const handleBinaryMessage = useCallback((blob: Blob) => {
    try {
      const url = URL.createObjectURL(blob);

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
    // Clear any pending disconnect timeout
    if (disconnectTimeoutRef.current) {
      clearTimeout(disconnectTimeoutRef.current);
      disconnectTimeoutRef.current = null;
    }

    if (!mountedRef.current || isConnectingRef.current) {
      return;
    }

    // Add a small delay before attempting to connect
    setTimeout(() => {
      if (!mountedRef.current) return;

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
            console.log("raw data", eventData);

            if (!eventData.type && typeof eventData === "object") {
              setState((prev) => ({
                ...prev,
                ...eventData,
                lastUpdate: new Date(),
              }));
              return;
            }

            switch (eventData.type) {
              case "initialData": {
                // Handle the combined initial state and config
                setState((prev) => ({
                  ...prev,
                  ...eventData.data.state,
                  settings: eventData.data.config,
                  isConfigLoaded: true,
                  lastUpdate: new Date(),
                }));
                console.log("Received initial data:", eventData.data);
                break;
              }
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
              case "configUpdate": {
                console.log("Received config update:", eventData.data);
                setState((prev) => ({
                  ...prev,
                  settings: eventData.data,
                  lastUpdate: new Date(),
                }));
                break;
              }
              case "systemLog": {
                setLogs((prev) => [
                  {
                    id: generateUUID(), // Using the new UUID generator
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
                  id: generateUUID(), // Using the new UUID generator
                  timestamp: new Date(),
                  level: eventData.level || "warning",
                  message: eventData.data.message,
                  acknowledged: false,
                };
                setAlerts((prev) => [newAlert, ...prev]);

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
    }, 500);
  }, [reconnectAttempts, handleBinaryMessage]);

  useEffect(() => {
    mountedRef.current = true;

    // Add a small delay before initial connection
    const initTimeout = setTimeout(connect, 100);

    return () => {
      mountedRef.current = false;

      if (initTimeout) {
        clearTimeout(initTimeout);
      }

      // Ensure cleanup happens before new connection attempts
      disconnectTimeoutRef.current = setTimeout(() => {
        if (wsRef.current) {
          wsRef.current.close(1000, "Component unmounting");
          wsRef.current = null;
        }

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        setState((prev) => {
          if (prev.currentImageUrl) {
            URL.revokeObjectURL(prev.currentImageUrl);
          }
          return prev;
        });

        isConnectingRef.current = false;
      }, 250);
    };
  }, [connect]);

  return {
    state,
    logs,
    alerts,
    connectionStatus,
    connectionError,
    reconnectAttempts,
    updateEjectionSettings,
  };
};
