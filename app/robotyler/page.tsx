"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Droplet,
  Home,
  SprayCanIcon,
  Play,
  Pause,
  Square,
  Save,
  Recycle,
  RotateCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import TrayVisualization from "@/components/robotyler/TrayVisualization";
import { v4 as uuidv4 } from "uuid";
import CombinedControls from "@/components/robotyler/CombinedSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LiveCameraFeed from "@/components/robotyler/LiveWebcamFeed";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import RoboTylerHeader from "@/components/robotyler/RoboTylerHeader";
import { MovementControls } from "@/components/robotyler/MovementControls";

export interface PatternStatus {
  command: number;
  total_commands: number;
  total_rows: number;
  row: number;
  pattern: string;
  single_side: boolean;
  details?: string;
  completed_rows: number[];
  duration: number;
  axis?: "X" | "Y";
}

export interface SystemState {
  status:
    | "IDLE"
    | "HOMING_X"
    | "HOMING_Y"
    | "HOMING_ROTATION"
    | "HOMED"
    | "DEPRESSURIZE_POT"
    | "STOPPED"
    | "PAUSED"
    | "EXECUTING_PATTERN"
    | "PRIMING"
    | "ERROR"
    | "CYCLE_COMPLETE"
    | "CLEANING"
    | "PAINTING_SIDE"
    | "MANUAL_ROTATING"
    | "UNKNOWN";
  position: {
    x: number;
    y: number;
  };
  systemInfo: {
    temperature: number;
    uptime: string;
  };
  patternProgress: PatternStatus;
  lastSerialMessage: string;
  pressurePotActive: boolean;
  limitSwitches?: {
    x: {
      min: boolean;
      max: boolean;
    };
    y: {
      min: boolean;
      max: boolean;
    };
  };
  servoAngle: number;
}

export const INITIAL_STATUS: SystemState = {
  status: "IDLE",
  position: { x: 0, y: 0 },
  systemInfo: {
    temperature: 24,
    uptime: "0d 0h 0m",
  },
  patternProgress: {
    command: 0,
    total_commands: 0,
    total_rows: 0,
    row: 0,
    pattern: "",
    single_side: false,
    completed_rows: [],
    duration: 0,
  },
  lastSerialMessage: "",
  pressurePotActive: false,
  servoAngle: 90,
};

export interface SystemSettings {
  speeds: {
    lip: number;
    back: number;
    front: number;
    right: number;
    left: number;
  };
  maintenance: {
    lastMaintenanceDate: string;
    maintenanceInterval: number;
    primeTime: number;
    cleanTime: number;
    backWashTime: number;
    pressurePotDelay: number;
    positions: {
      prime: { x: number; y: number; angle: number };
      clean: { x: number; y: number; angle: number };
    };
  };
  pattern: {
    offsets: { x: number; y: number };
    travelDistance: { x: number; y: number };
    rows: { x: number; y: number };
  };
}

interface SavedConfig {
  name: string;
  description?: string;
  timestamp: string;
}

export default function Dashboard() {
  const [selectedIp, setSelectedIp] = useState("192.168.1.222:8080");
  const [state, setState] = useState<SystemState>(INITIAL_STATUS);
  const [wsConnected, setWsConnected] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingSpeedChanges, setPendingSpeedChanges] = useState<
    Partial<SystemSettings["speeds"]>
  >({});
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const heartbeatInterval = useRef<NodeJS.Timeout>();
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;
  const HEARTBEAT_INTERVAL = 30000;
  const [showCameraFeed, setShowCameraFeed] = useState(false);
  const [pendingMaintenanceSettings, setPendingMaintenanceSettings] = useState<{
    primeTime?: number;
    cleanTime?: number;
    backWashTime?: number;
  }>({});
  const [hasUnsavedMaintenanceChanges, setHasUnsavedMaintenanceChanges] =
    useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    speeds: { back: 0, front: 0, right: 0, left: 0 },
    maintenance: {
      lastMaintenanceDate: new Date().toISOString(),
      maintenanceInterval: 30,
      primeTime: 5,
      cleanTime: 10,
      backWashTime: 15,
    },
    pattern: {
      offsets: { x: 0, y: 0 },
      travelDistance: { x: 0, y: 0 },
      rows: { x: 0, y: 0 },
    },
  });
  const [configs, setConfigs] = useState<SavedConfig[]>([]);

  const handleEmergencyStop = () => {
    sendCommand({ type: "EMERGENCY_STOP" });
  };

  const handleRotate = (direction: "left" | "right") => {
    sendCommand({
      type: "ROTATE_SPINNER",
      payload: { direction, degrees: 90 },
    });
  };

  // Cleanup function for WebSocket
  const cleanupWebSocket = useCallback(() => {
    if (ws.current) {
      ws.current.onclose = null;
      ws.current.close();
      ws.current = null;
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }
    setWsConnected(false);
  }, []);

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    try {
      cleanupWebSocket();

      const socket = new WebSocket(`ws://${selectedIp}`);
      ws.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connected");
        setWsConnected(true);
        reconnectAttempts.current = 0;
        toast.success("Connected to system");

        heartbeatInterval.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "HEARTBEAT" }));
          }
        }, HEARTBEAT_INTERVAL);
      };

      socket.onclose = (event) => {
        console.log("WebSocket disconnected", event.code, event.reason);
        setWsConnected(false);
        cleanupWebSocket();
        toast.error("Disconnected from system", {
          description: "Attempting to reconnect...",
        });

        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          console.log(
            `Attempting to reconnect (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})...`
          );

          reconnectTimeout.current = setTimeout(() => {
            initializeWebSocket();
          }, RECONNECT_DELAY);
        } else {
          console.log("Max reconnection attempts reached");
          toast.error("Connection failed", {
            description:
              "Maximum reconnection attempts reached. Please try again manually.",
          });
        }
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case "STATE_UPDATE":
              setState((prevStatus) => ({
                ...message.payload,
                rawSerial:
                  message.payload.rawSerial || prevStatus.lastSerialMessage,
              }));
              break;

            case "SERVO_UPDATE":
              setState((prevStatus) => {
                const newState = {
                  ...prevStatus,
                  servoAngle: message.payload.angle,
                };
                return newState;
              });
              break;

            case "SETTINGS_UPDATE":
              console.log("SETTINGS_UPDATE", message.payload);
              setSettings(message.payload);
              // Clear any pending changes that match the new settings
              setPendingSpeedChanges((prev) => {
                const newPending = { ...prev };
                Object.entries(message.payload.speeds).forEach(
                  ([side, value]) => {
                    if (newPending[side as keyof typeof newPending] === value) {
                      delete newPending[side as keyof typeof newPending];
                    }
                  }
                );
                return newPending;
              });
              setPendingMaintenanceSettings({}); // Clear all pending maintenance settings
              setHasUnsavedMaintenanceChanges(false); // Reset the flag
              break;

            case "SERIAL_DATA":
              setState((prevStatus) => ({
                ...prevStatus,
                rawSerial: message.payload,
              }));
              break;

            case "WARNING":
              const toastType = {
                high: "error",
                medium: "warning",
                low: "info",
              }[message.payload.severity || "medium"] as
                | "error"
                | "warning"
                | "info";

              toast[toastType](message.payload.title, {
                description: message.payload.message,
                duration: 5000,
                className:
                  "dark:bg-gray-800 dark:text-gray-100 dark:border dark:border-gray-700",
              });
              break;

            case "ERROR":
              toast.error(message.payload.message, {
                description: message.payload.details,
                duration: 5000,
                className:
                  "dark:bg-gray-800 dark:text-gray-100 dark:border dark:border-gray-700",
              });
              break;

            case "CONFIGS_UPDATE":
              console.log("CONFIGS_UPDATE", message.payload);
              setConfigs(message.payload);
              break;

            default:
              console.log("[WebSocket] Unhandled message type:", message.type);
          }
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error);
          toast.error("Failed to process server message", {
            description: "Please try again or refresh the page",
          });
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Error initializing WebSocket:", error);
      cleanupWebSocket();
    }
  }, [cleanupWebSocket, selectedIp]);

  // Update useEffect to depend on selectedIp
  useEffect(() => {
    initializeWebSocket();
    return () => cleanupWebSocket();
  }, [initializeWebSocket, cleanupWebSocket, selectedIp]);

  const sendCommand = useCallback(
    (command: { type: string; payload?: any }) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        try {
          ws.current.send(JSON.stringify(command));
        } catch (error) {
          console.error("Error sending command:", error);
          cleanupWebSocket();
          initializeWebSocket();
        }
      } else {
        console.warn("Cannot send command: WebSocket is not connected");
        if (
          !wsConnected &&
          reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS
        ) {
          initializeWebSocket();
        }
      }
    },
    [wsConnected, cleanupWebSocket, initializeWebSocket]
  );

  const handleReconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    initializeWebSocket();
  }, [initializeWebSocket]);

  const handleSpeedChange = (
    side: keyof SystemSettings["speeds"],
    value: number[]
  ) => {
    const newSpeed = value[0];
    setPendingSpeedChanges((prev: Partial<SystemSettings["speeds"]>) => ({
      ...prev,
      [side]: newSpeed,
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = () => {
    sendCommand({
      type: "UPDATE_SETTINGS",
      payload: {
        speeds: pendingSpeedChanges,
      },
    });
    setHasUnsavedChanges(false);
    setPendingSpeedChanges({});
  };

  const handleDiscardChanges = () => {
    setPendingSpeedChanges({});
    setHasUnsavedChanges(false);
    setShowUnsavedDialog(false);
  };

  const isPaused = state.status === "PAUSED";

  // SHOW BUTTONS
  const showStartButton = state.status === "HOMED" || state.status === "PAUSED";
  const showPauseButton =
    state.status === "EXECUTING_PATTERN" ||
    state.status === "HOMING_X" ||
    state.status === "HOMING_Y" ||
    state.status === "PAINTING_SIDE";
  const showStopButton =
    state.status === "DEPRESSURIZE_POT" ||
    state.status === "CLEANING" ||
    state.status === "EXECUTING_PATTERN" ||
    state.status === "HOMING_X" ||
    state.status === "HOMING_Y" ||
    state.status === "PAINTING_SIDE" ||
    state.status === "PAUSED";
  const showPrimeButton =
    state.status === "STOPPED" || state.status === "HOMED";
  const showCleanButton =
    state.status === "STOPPED" || state.status === "HOMED";
  const showHomeButton = state.status !== "HOMED" || state.status === "PAUSED";

  const handleMaintenanceSettingChange = (
    setting: "primeTime" | "cleanTime" | "backWashTime",
    value: number
  ) => {
    handlePendingMaintenanceChange(setting, value);
  };

  const handlePendingMaintenanceChange = (
    setting:
      | "primeTime"
      | "cleanTime"
      | "backWashTime"
      | "pressurePotDelay"
      | "positions",
    value:
      | number
      | {
          prime?: { x: number; y: number; angle: number };
          clean?: { x: number; y: number; angle: number };
        }
  ) => {
    setPendingMaintenanceSettings((prev) => {
      const newState = {
        ...prev,
        [setting]: value,
      };
      return newState;
    });

    // Add this line to set hasUnsavedMaintenanceChanges
    setHasUnsavedMaintenanceChanges(true);
  };

  const handleSaveMaintenanceChanges = () => {
    sendCommand({
      type: "UPDATE_SETTINGS",
      payload: {
        maintenance: pendingMaintenanceSettings,
      },
    });
    // Don't clear the state here - wait for the SETTINGS_UPDATE message
  };

  // Add useEffect for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input/textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "Enter") {
        if (hasUnsavedMaintenanceChanges && wsConnected) {
          handleSaveMaintenanceChanges();
        }
        if (Object.keys(pendingSpeedChanges).length > 0 && wsConnected) {
          handleSaveChanges();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    hasUnsavedMaintenanceChanges,
    pendingSpeedChanges,
    wsConnected,
    handleSaveMaintenanceChanges,
    handleSaveChanges,
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <RoboTylerHeader
        status={state}
        wsConnected={wsConnected}
        reconnectAttempts={reconnectAttempts.current}
        MAX_RECONNECT_ATTEMPTS={MAX_RECONNECT_ATTEMPTS}
        handleReconnect={handleReconnect}
        hasExceededReconnectAttempts={
          reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS
        }
        onSelectComputer={setSelectedIp}
        showCameraFeed={showCameraFeed}
        onToggleCameraFeed={() => setShowCameraFeed(!showCameraFeed)}
        computers={[
          { name: "Bentzi's Laptop", ip: "192.168.1.222:8080" },
          { name: "RoboTyler Raspi", ip: "192.168.1.197:8080" },
          { name: "Pi Zero 2", ip: "192.168.1.215:8080" },
          { name: "Dev Testing Raspi", ip: "192.168.1.216:8080" },
          { name: "localhost", ip: "localhost:8080" },
        ]}
        sendCommand={sendCommand}
      />

      <main className="container mx-auto px-4 py-6 flex-1">
        <div className="grid gap-6">
          {/* Operation Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* System Controls Card */}
            <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 h-[200px] lg:h-[100px]">
                  <Button
                    className="relative p-3 rounded-lg bg-white dark:bg-gray-800 
                      border border-gray-200 dark:border-transparent
                      hover:bg-gray-50 dark:hover:bg-gray-750
                      hover:border-purple-500 dark:hover:border-purple-400
                      hover:shadow-md hover:scale-[1.02]
                      transform transition-all duration-200 ease-in-out
                      disabled:opacity-50 disabled:hover:scale-100 
                      disabled:hover:shadow-none disabled:hover:border-gray-200
                      h-full flex flex-col items-center justify-center"
                    onClick={() => sendCommand({ type: "PRIME_GUN" })}
                    disabled={!showPrimeButton || !wsConnected}
                  >
                    <SprayCanIcon className="w-5 h-5 text-purple-500 dark:text-purple-400 mb-2" />
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300 text-center">
                      Prime Gun
                    </span>
                  </Button>

                  <Button
                    className="relative p-3 rounded-lg bg-white dark:bg-gray-800 
                      border border-gray-200 dark:border-transparent
                      hover:bg-gray-50 dark:hover:bg-gray-750
                      hover:border-cyan-500 dark:hover:border-cyan-400
                      hover:shadow-md hover:scale-[1.02]
                      transform transition-all duration-200 ease-in-out
                      disabled:opacity-50 disabled:hover:scale-100 
                      disabled:hover:shadow-none disabled:hover:border-gray-200
                      h-full flex flex-col items-center justify-center"
                    onClick={() => sendCommand({ type: "CLEAN_GUN" })}
                    disabled={!showCleanButton || !wsConnected}
                  >
                    <Droplet className="w-5 h-5 text-cyan-500 dark:text-cyan-400 mb-2" />
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300 text-center">
                      Clean Gun
                    </span>
                  </Button>

                  <Button
                    className="relative p-3 rounded-lg bg-white dark:bg-gray-800 
                      border border-gray-200 dark:border-transparent
                      hover:bg-gray-50 dark:hover:bg-gray-750
                      hover:border-teal-500 dark:hover:border-teal-400
                      hover:shadow-md hover:scale-[1.02]
                      transform transition-all duration-200 ease-in-out
                      disabled:opacity-50 disabled:hover:scale-100 
                      disabled:hover:shadow-none disabled:hover:border-gray-200
                      h-full flex flex-col items-center justify-center"
                    onClick={() => sendCommand({ type: "BACK_WASH" })}
                    disabled={!showCleanButton || !wsConnected}
                  >
                    <Recycle className="w-5 h-5 text-teal-500 dark:text-teal-400 mb-2" />
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300 text-center">
                      Back Wash
                    </span>
                  </Button>

                  <Button
                    className={`relative p-3 rounded-lg bg-white dark:bg-gray-800 
                      border ${
                        state.pressurePotActive
                          ? "border-amber-500 dark:border-amber-400"
                          : "border-gray-200 dark:border-transparent"
                      }
                      hover:bg-gray-50 dark:hover:bg-gray-750
                      ${
                        state.pressurePotActive
                          ? "hover:border-amber-500 dark:hover:border-amber-400"
                          : "hover:border-gray-500 dark:hover:border-gray-400"
                      }
                      hover:shadow-md hover:scale-[1.02]
                      transform transition-all duration-200 ease-in-out
                      disabled:opacity-50 disabled:hover:scale-100 
                      disabled:hover:shadow-none disabled:hover:border-gray-200
                      h-full flex flex-col items-center justify-center`}
                    onClick={() => sendCommand({ type: "TOGGLE_PRESSURE_POT" })}
                    disabled={
                      !(
                        state.status === "STOPPED" || state.status === "HOMED"
                      ) || !wsConnected
                    }
                  >
                    <Zap
                      className={`w-5 h-5 mb-2 ${
                        state.pressurePotActive
                          ? "text-amber-500 dark:text-amber-400"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    />
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300 text-center">
                      {state.pressurePotActive
                        ? "Depressurize Pot"
                        : "Pressurize Pot"}
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Operation Controls Card */}
            <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 h-[200px] lg:h-[100px]">
                  <Button
                    className="relative p-3 rounded-lg bg-white dark:bg-gray-800 
                      border border-gray-200 dark:border-transparent
                      hover:bg-gray-50 dark:hover:bg-gray-750
                      hover:border-blue-500 dark:hover:border-blue-400
                      hover:shadow-md hover:scale-[1.02]
                      transform transition-all duration-200 ease-in-out
                      disabled:opacity-50 disabled:hover:scale-100 
                      disabled:hover:shadow-none disabled:hover:border-gray-200
                      h-full flex flex-col items-center justify-center"
                    onClick={() => sendCommand({ type: "HOME_SYSTEM" })}
                    disabled={!showHomeButton || !wsConnected}
                  >
                    <Home className="w-5 h-5 text-blue-500 dark:text-blue-400 mb-2" />
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300 text-center">
                      Home System
                    </span>
                  </Button>

                  <Button
                    className="relative p-3 rounded-lg bg-white dark:bg-gray-800 
                      border border-gray-200 dark:border-transparent
                      hover:bg-gray-50 dark:hover:bg-gray-750
                      hover:border-green-500 dark:hover:border-green-400
                      hover:shadow-md hover:scale-[1.02]
                      transform transition-all duration-200 ease-in-out
                      disabled:opacity-50 disabled:hover:scale-100 
                      disabled:hover:shadow-none disabled:hover:border-gray-200
                      h-full flex flex-col items-center justify-center"
                    onClick={() => sendCommand({ type: "START_PAINTING" })}
                    disabled={!showStartButton || !wsConnected}
                  >
                    <Play className="w-5 h-5 text-green-500 dark:text-green-400 mb-2" />
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300 text-center">
                      {isPaused ? "Resume" : "Start"}
                    </span>
                  </Button>

                  <Button
                    className="relative p-3 rounded-lg bg-white dark:bg-gray-800 
                      border border-gray-200 dark:border-transparent
                      hover:bg-gray-50 dark:hover:bg-gray-750
                      hover:border-yellow-500 dark:hover:border-yellow-400
                      hover:shadow-md hover:scale-[1.02]
                      transform transition-all duration-200 ease-in-out
                      disabled:opacity-50 disabled:hover:scale-100 
                      disabled:hover:shadow-none disabled:hover:border-gray-200
                      h-full flex flex-col items-center justify-center"
                    onClick={() => sendCommand({ type: "PAUSE_PAINTING" })}
                    disabled={!showPauseButton || !wsConnected}
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Pause className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mb-2" />
                      <span className="font-medium text-sm text-gray-700 dark:text-gray-300 text-center">
                        Pause
                      </span>
                    </div>
                  </Button>

                  <Button
                    className="relative p-3 rounded-lg bg-white dark:bg-gray-800 
                      border border-gray-200 dark:border-transparent
                      hover:bg-gray-50 dark:hover:bg-gray-750
                      hover:border-red-500 dark:hover:border-red-400
                      hover:shadow-md hover:scale-[1.02]
                      transform transition-all duration-200 ease-in-out
                      disabled:opacity-50 disabled:hover:scale-100 
                      disabled:hover:shadow-none disabled:hover:border-gray-200
                      h-full flex flex-col items-center justify-center"
                    onClick={() => sendCommand({ type: "STOP_PAINTING" })}
                    disabled={!showStopButton || !wsConnected}
                  >
                    <Square className="w-5 h-5 text-red-500 dark:text-red-400 mb-2" />
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300 text-center">
                      Stop
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tray Visualization and Camera Feed */}
          <div className="grid gap-6">
            <motion.div
              layout
              className={`grid ${showCameraFeed ? "lg:grid-cols-2" : ""} gap-6`}
            >
              <motion.div
                layout
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 ${
                  showCameraFeed ? "" : "col-span-full"
                }`}
              >
                <TrayVisualization
                  status={state}
                  settings={settings}
                  className="w-full"
                  onSideClick={(side) => sendCommand({ type: `PAINT_${side}` })}
                  onUpdateSettings={sendCommand}
                  wsConnected={wsConnected}
                />
              </motion.div>

              <AnimatePresence mode="popLayout">
                {showCameraFeed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LiveCameraFeed initialWsIp={selectedIp} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Movement Controls Card - NEW */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center">
                <RotateCw className="mr-2 h-5 w-5 text-blue-500" />
                Movement Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MovementControls
                wsConnected={wsConnected}
                sendCommand={sendCommand}
                handleRotate={handleRotate}
                position={state.position}
                limitSwitches={state.limitSwitches}
                servoAngle={state.servoAngle}
                status={state}
              />
            </CardContent>
          </Card>

          {/* Combined Settings Card */}
          <CombinedControls
            status={state}
            settings={settings}
            pendingSpeedChanges={pendingSpeedChanges}
            handleSpeedChange={handleSpeedChange}
            handleRotate={handleRotate}
            handleSaveChanges={handleSaveChanges}
            wsConnected={wsConnected}
            onMaintenanceSettingChange={handleMaintenanceSettingChange}
            pendingMaintenanceSettings={pendingMaintenanceSettings}
            onPendingMaintenanceChange={handlePendingMaintenanceChange}
            onSaveMaintenanceChanges={handleSaveMaintenanceChanges}
            hasUnsavedMaintenanceChanges={hasUnsavedMaintenanceChanges}
            sendCommand={sendCommand}
            limitSwitches={state.limitSwitches}
            configs={configs}
          />
        </div>
      </main>

      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className="dark:bg-gray-800 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Unsaved Changes
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
              Are you sure you want to discard your changes? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setShowUnsavedDialog(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDiscardChanges}
              className="bg-red-500 hover:bg-red-600"
            >
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
