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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import WarningSystem, { Warning } from "@/components/robotyler/WarningSystem";
import TrayVisualization from "@/components/robotyler/TrayVisualization";
import { v4 as uuidv4 } from "uuid";
import CombinedControls from "@/components/robotyler/CombinedSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LiveCameraFeed from "@/components/robotyler/LiveWebcamFeed";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import RoboTylerHeader from "@/components/robotyler/RoboTylerHeader";

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
  warnings: Warning[];
  lastSerialMessage: string;
  pressurePotActive: boolean;
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
  warnings: [],
  lastSerialMessage: "",
  pressurePotActive: false,
};

export interface SystemSettings {
  speeds: {
    front: number;
    right: number;
    back: number;
    left: number;
  };
  maintenance: {
    lastMaintenanceDate: string;
    maintenanceInterval: number;
    primeTime: number;
    cleanTime: number;
    backWashTime: number;
  };
  pattern: {
    offsets: { x: number; y: number };
    travelDistance: { x: number; y: number };
    rows: { x: number; y: number };
  };
}

export default function Dashboard() {
  const [selectedIp, setSelectedIp] = useState("192.168.1.222");
  const [state, setState] = useState<SystemState>(INITIAL_STATUS);
  const [wsConnected, setWsConnected] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [activeWarnings, setActiveWarnings] = useState<Warning[]>([]);
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
    speeds: { front: 0, right: 0, back: 0, left: 0 },
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
              setPendingMaintenanceSettings((prev) => {
                const newPending = { ...prev };
                if (message.payload.maintenance.primeTime === prev.primeTime) {
                  delete newPending.primeTime;
                }
                if (message.payload.maintenance.cleanTime === prev.cleanTime) {
                  delete newPending.cleanTime;
                }
                return newPending;
              });
              break;

            case "SERIAL_DATA":
              setState((prevStatus) => ({
                ...prevStatus,
                rawSerial: message.payload,
              }));
              break;

            case "WARNING":
              console.log(message.payload);
              const newWarning = {
                id: uuidv4(),
                type: message.payload.severity,
                title: message.payload.title,
                message: message.payload.message,
                timestamp: new Date(),
              };
              setActiveWarnings((prev) => [...prev, newWarning]);
              break;

            case "ERROR":
              toast.error(message.payload.message, {
                description: message.payload.details,
                duration: 5000,
              });
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

  // Add the dismiss handler
  const handleDismissWarning = (id: string) => {
    setActiveWarnings((prev) => prev.filter((warning) => warning.id !== id));
  };

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
  const showStartButton = state.status == "HOMED";
  const showPauseButton =
    state.status == "EXECUTING_PATTERN" ||
    state.status == "HOMING_X" ||
    state.status == "HOMING_Y" ||
    state.status == "PAINTING_SIDE";
  const showStopButton =
    state.status == "DEPRESSURIZE_POT" ||
    state.status == "CLEANING" ||
    state.status == "EXECUTING_PATTERN" ||
    state.status == "HOMING_X" ||
    state.status == "HOMING_Y" ||
    state.status == "PAINTING_SIDE";
  const showPrimeButton = state.status == "STOPPED" || state.status == "HOMED";
  const showCleanButton = state.status == "STOPPED" || state.status == "HOMED";
  const showHomeButton = state.status !== "HOMED";

  const handleMaintenanceSettingChange = (
    setting: "primeTime" | "cleanTime" | "backWashTime",
    value: number
  ) => {
    handlePendingMaintenanceChange(setting, value);
  };

  const handlePendingMaintenanceChange = (
    setting: "primeTime" | "cleanTime" | "backWashTime",
    value: number
  ) => {
    setPendingMaintenanceSettings((prev) => ({
      ...prev,
      [setting]: value,
    }));
    setHasUnsavedMaintenanceChanges(true);
  };

  const handleSaveMaintenanceChanges = () => {
    sendCommand({
      type: "UPDATE_SETTINGS",
      payload: {
        maintenance: pendingMaintenanceSettings,
      },
    });
  };

  return (
    <div className="min-h-screen">
      <RoboTylerHeader
        status={state}
        settings={settings}
        wsConnected={wsConnected}
        handleEmergencyStop={handleEmergencyStop}
        reconnectAttempts={reconnectAttempts.current}
        MAX_RECONNECT_ATTEMPTS={MAX_RECONNECT_ATTEMPTS}
        handleReconnect={handleReconnect}
        hasExceededReconnectAttempts={
          reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS
        }
        onSelectComputer={setSelectedIp}
        showCameraFeed={showCameraFeed}
        onToggleCameraFeed={() => setShowCameraFeed(!showCameraFeed)}
      />

      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <SprayCanIcon className="mr-2 h-5 w-5 text-blue-500" />
                  System Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md transition-all duration-200"
                    onClick={() => sendCommand({ type: "PRIME_GUN" })}
                    disabled={!showPrimeButton || !wsConnected}
                  >
                    <SprayCanIcon className="mr-2" size={18} />
                    Prime Gun
                  </Button>
                  <Button
                    className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-md transition-all duration-200"
                    onClick={() => sendCommand({ type: "CLEAN_GUN" })}
                    disabled={!showCleanButton || !wsConnected}
                  >
                    <Droplet className="mr-2" size={18} />
                    Clean Gun
                  </Button>
                  <Button
                    className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-md transition-all duration-200"
                    onClick={() => sendCommand({ type: "BACK_WASH" })}
                    disabled={!wsConnected}
                  >
                    <Recycle className="mr-2" size={18} />
                    Back Wash
                  </Button>
                  <Button
                    className={`w-full bg-gradient-to-r ${
                      state.pressurePotActive
                        ? "from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                        : "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    } text-white shadow-md transition-all duration-200`}
                    onClick={() => sendCommand({ type: "TOGGLE_PRESSURE_POT" })}
                    disabled={
                      !(
                        state.status === "STOPPED" || state.status === "HOMED"
                      ) || !wsConnected
                    }
                  >
                    <Zap className="mr-2" size={18} />
                    {state.pressurePotActive
                      ? "Depressurize Pot"
                      : "Pressurize Pot"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Operation Controls Card */}
            <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Play className="mr-2 h-5 w-5 text-green-500" />
                  Operation Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Button
                    onClick={() => sendCommand({ type: "HOME_SYSTEM" })}
                    disabled={!showHomeButton || !wsConnected}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md transition-all duration-200"
                  >
                    <Home className="mr-2" size={18} />
                    Home System
                  </Button>
                  <Button
                    onClick={() => sendCommand({ type: "START_PAINTING" })}
                    disabled={!showStartButton || !wsConnected}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md transition-all duration-200"
                  >
                    <Play className="mr-2" size={18} />
                    Start
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => sendCommand({ type: "PAUSE_PAINTING" })}
                    disabled={!showPauseButton || !wsConnected}
                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-md transition-all duration-200"
                  >
                    {isPaused ? (
                      <Play size={18} className="mr-2" />
                    ) : (
                      <Pause size={18} className="mr-2" />
                    )}
                    {isPaused ? "Resume" : "Pause"}
                  </Button>
                  <Button
                    onClick={() => sendCommand({ type: "STOP_PAINTING" })}
                    disabled={!showStopButton || !wsConnected}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md transition-all duration-200"
                  >
                    <Square className="mr-2" size={18} />
                    Stop
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

          {/* Combined Speed & Movement Controls */}
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

      {/* Warning System */}
      <WarningSystem
        warnings={activeWarnings}
        onDismiss={handleDismissWarning}
      />
    </div>
  );
}
