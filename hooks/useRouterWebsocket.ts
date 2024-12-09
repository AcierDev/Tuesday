import {
  Alert,
  ConnectionStatus,
  LogEntry,
  ExtendedState,
  RouterSettings,
  AnalysisImage,
} from "@/typings/types";
import { DEFAULT_ROUTER_SETTINGS } from "@/typings/constants";
import { generateUUID } from "@/utils/functions";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

const DEFAULT_WEBSOCKET_URL = "ws://192.168.1.222:8080/ws";
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

const INITIAL_STATE: ExtendedState = {
  status: "disconnected",
  router_state: "idle",
  push_cylinder: "OFF",
  riser_cylinder: "OFF",
  ejection_cylinder: "OFF",
  sensor1: "OFF",
  analysisMode: false,
  lastUpdate: new Date(),
  currentImageUrl: null,
  currentImageMetadata: null,
  currentAnalysis: null,
  isCapturing: false,
  isProcessing: false,
  isAnalyzing: false,
  settings: DEFAULT_ROUTER_SETTINGS,
  uptime: "00:00:00",
  cpuUsage: 0,
  memoryUsage: 0,
  temperature: 0,
  ejectionDecision: null,
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
  const [wsUrl, setWsUrl] = useState<string>(DEFAULT_WEBSOCKET_URL);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isReconnecting, setIsReconnecting] = useState(false);

  const updateEjectionSettings = useCallback((newSettings: RouterSettings) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "updateSettings",
          data: {
            slave: newSettings.slave,
            ejection: newSettings.ejection,
          },
        })
      );
      setState((prev) => ({
        ...prev,
        settings: newSettings,
        lastUpdate: new Date(),
      }));
      toast.success("Router settings updated");
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
    if (
      wsRef.current?.readyState === WebSocket.CONNECTING ||
      wsRef.current?.readyState === WebSocket.OPEN ||
      isConnectingRef.current ||
      !mountedRef.current ||
      isReconnecting
    ) {
      console.log(
        "Connection attempt blocked - already connecting or connected"
      );
      return;
    }

    // Clear any pending timeouts
    if (disconnectTimeoutRef.current) {
      clearTimeout(disconnectTimeoutRef.current);
      disconnectTimeoutRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      setIsReconnecting(true);
      isConnectingRef.current = true;
      setConnectionStatus("connecting");

      console.log(`Attempting to connect to: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      ws.binaryType = "blob";
      wsRef.current = ws;

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log("Connection timeout, closing socket");
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
        setIsReconnecting(false);
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

          switch (eventData.type) {
            case "state":
              setState((prev) => {
                // If capturing is starting, reset all analysis-related state
                if (eventData.data.isCapturing && !prev.isCapturing) {
                  return {
                    ...prev,
                    ...eventData.data,
                    ejectionDecision: null,
                    currentAnalysis: null,
                    currentImageMetadata: null,
                    isAnalyzing: false,
                    lastUpdate: new Date(),
                  };
                }

                return {
                  ...prev,
                  ...eventData.data,
                  ejectionDecision:
                    eventData.data.isCapturing || eventData.data.isAnalyzing
                      ? null
                      : prev.ejectionDecision,
                  // Clear analysis when capturing starts
                  currentAnalysis: eventData.data.isCapturing
                    ? null
                    : prev.currentAnalysis,
                  lastUpdate: new Date(),
                };
              });
              return;
            case "settingsUpdate": {
              console.log("Received settings update:", eventData.data);
              setState((prev) => ({
                ...prev,
                settings: eventData.data,
                lastUpdate: new Date(),
              }));
              break;
            }
            case "log": {
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
            case "analysis_results": {
              // console.log("Raw analysis results:", eventData.data);
              // console.log("Predictions:", eventData.data.data.predictions);
              setState((prev) => ({
                ...prev,
                currentAnalysis: {
                  data: {
                    file_info: eventData.data.data.file_info,
                    predictions: eventData.data.data.predictions,
                  },
                  success: eventData.data.success,
                  timestamp: eventData.data.timestamp,
                },
                isAnalyzing: false,
                lastUpdate: new Date(),
              }));
              break;
            }
            case "ejection_decision": {
              // Make sure we're getting a boolean value
              const shouldEject = Boolean(eventData.data.decision);
              setState((prev) => ({
                ...prev,
                ejectionDecision: shouldEject,
                lastUpdate: new Date(),
              }));
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
            case "analysis_image": {
              const analysisImage = eventData.data as AnalysisImage;
              setState((prev) => ({
                ...prev,
                currentImageUrl: analysisImage.imageData,
                currentImageMetadata: {
                  type: "image",
                  url: analysisImage.imageData,
                  filename: analysisImage.path.split("/").pop() || "",
                  timestamp: analysisImage.timestamp,
                  captureSuccess: true,
                },
                isCapturing: false,
                ejectionDecision: null,
                lastUpdate: new Date(),
              }));
              break;
            }
            case "systemStats": {
              // Handle system stats updates
              setState((prev) => ({
                ...prev,
                uptime: eventData.data.uptime,
                cpuUsage: eventData.data.cpuUsage,
                memoryUsage: eventData.data.memoryUsage,
                temperature: eventData.data.temperature,
                lastUpdate: new Date(),
              }));
              break;
            }
            case "warning": {
              toast.warning(eventData.data.message);
              setLogs((prev) => [
                {
                  id: generateUUID(),
                  timestamp: new Date(),
                  level: "warning",
                  message: eventData.data.message,
                  source: "system",
                },
                ...prev,
              ]);
              break;
            }
            case "error": {
              toast.error(eventData.data.message);
              setLogs((prev) => [
                {
                  id: generateUUID(),
                  timestamp: new Date(),
                  level: "error",
                  message: eventData.data.message,
                  source: "system",
                },
                ...prev,
              ]);
              break;
            }
            case "cycle_stats": {
              setState((prev) => ({
                ...prev,
                currentCycleStats: eventData.data,
                lastUpdate: new Date(),
              }));
              break;
            }
            case "daily_stats": {
              setState((prev) => ({
                ...prev,
                dailyStats: eventData.data,
                lastUpdate: new Date(),
              }));
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
        setIsReconnecting(false);

        if (event.code !== 1000 && event.code !== 1005) {
          toast.error("Disconnected from system");
        }

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

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (!mountedRef.current) return;
        setConnectionStatus("disconnected");
        isConnectingRef.current = false;
        setIsReconnecting(false);
      };
    } catch (error) {
      console.error("WebSocket connection error:", error);
      if (!mountedRef.current) return;
      setConnectionStatus("disconnected");
      setConnectionError(
        "Failed to establish WebSocket connection. Please check your network connection."
      );
      isConnectingRef.current = false;
      setIsReconnecting(false);
    }
  }, [reconnectAttempts, handleBinaryMessage, wsUrl]);

  useEffect(() => {
    mountedRef.current = true;

    // Initial connection attempt
    const initTimeout = setTimeout(connect, 100);

    // Cleanup function
    return () => {
      mountedRef.current = false;
      clearTimeout(initTimeout);

      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
        wsRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }

      setState((prev) => {
        if (prev.currentImageUrl) {
          URL.revokeObjectURL(prev.currentImageUrl);
        }
        return prev;
      });

      isConnectingRef.current = false;
      setIsReconnecting(false);
    };
  }, [connect]);

  const updateWebSocketUrl = useCallback(
    (newUrl: string) => {
      // Don't modify the URL if it's already a complete WebSocket URL
      const formattedUrl =
        newUrl.startsWith("ws://") || newUrl.startsWith("wss://")
          ? newUrl
          : `ws://${newUrl}${newUrl.includes("/ws") ? "" : "/ws"}`;

      // Only update if the URL has actually changed
      if (formattedUrl !== wsUrl) {
        setWsUrl(formattedUrl);

        if (wsRef.current) {
          wsRef.current.close(1000, "Switching endpoint");
        }
        setReconnectAttempts(0);
        setConnectionError("");
      }
    },
    [wsUrl]
  );

  return {
    state,
    logs,
    alerts,
    connectionStatus,
    connectionError,
    reconnectAttempts,
    updateEjectionSettings,
    updateWebSocketUrl,
    wsUrl,
  };
};
