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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import WarningSystem, { Warning } from "@/components/tyler/WarningSystem";
import TrayVisualization from "@/components/tyler/TrayVisualization";
import { v4 as uuidv4 } from "uuid";
import CombinedControls from "@/components/tyler/SpeedAndMovement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RoboTylerHeader from "@/components/tyler/RoboTylerHeader";

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

export interface SystemStatus {
  state:
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
  speeds: {
    front: number;
    right: number;
    back: number;
    left: number;
  };
  systemInfo: {
    temperature: number;
    uptime: string;
    lastMaintenance: string;
  };
  patternProgress: PatternStatus;
  warnings: Warning[];
  lastSerialMessage: string;
  pressurePotActive: boolean;
}

export const INITIAL_STATUS: SystemStatus = {
  state: "IDLE",
  position: { x: 0, y: 0 },
  speeds: {
    front: 0,
    right: 0,
    back: 0,
    left: 0,
  },
  systemInfo: {
    temperature: 24,
    uptime: "0d 0h 0m",
    lastMaintenance: "2024-03-20",
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

export default function Dashboard() {
  const [status, setStatus] = useState<SystemStatus>(INITIAL_STATUS);
  const [wsConnected, setWsConnected] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [activeWarnings, setActiveWarnings] = useState<Warning[]>([]);
  const [pendingSpeedChanges, setPendingSpeedChanges] = useState<
    Partial<typeof status.speeds>
  >({});
  const [pendingHomeSpeed, setPendingHomeSpeed] = useState<number | null>(null);
  const [pendingAcceleration, setPendingAcceleration] = useState<number | null>(
    null
  );
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const heartbeatInterval = useRef<NodeJS.Timeout>();
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;
  const HEARTBEAT_INTERVAL = 30000;

  const handleHomeSpeedChange = (value: number[]) => {
    setPendingHomeSpeed(value[0]!);
    setHasUnsavedChanges(true);
  };

  const handleAccelerationChange = (value: number[]) => {
    setPendingAcceleration(value[0]!);
    setHasUnsavedChanges(true);
  };

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

      const socket = new WebSocket("ws://192.168.1.222:8080");
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
          console.log("[WebSocket] Received message type:", message.type);

          switch (message.type) {
            case "STATUS_UPDATE":
              console.log(message.payload.patternProgress);
              setStatus((prevStatus) => ({
                ...message.payload,
                rawSerial:
                  message.payload.rawSerial || prevStatus.lastSerialMessage,
              }));
              // console.log(message.payload);
              break;

            case "SERIAL_DATA":
              setStatus((prevStatus) => ({
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

            default:
              console.log("[WebSocket] Unhandled message type:", message.type);
          }
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Error initializing WebSocket:", error);
      cleanupWebSocket();
    }
  }, [cleanupWebSocket]);

  // Add the dismiss handler
  const handleDismissWarning = (id: string) => {
    setActiveWarnings((prev) => prev.filter((warning) => warning.id !== id));
  };

  useEffect(() => {
    initializeWebSocket();
    return () => cleanupWebSocket();
  }, [initializeWebSocket, cleanupWebSocket]);

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
    side: keyof typeof status.speeds,
    value: number[]
  ) => {
    const newSpeed = value[0];
    setPendingSpeedChanges((prev) => ({
      ...prev,
      [side]: newSpeed,
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = () => {
    Object.entries(pendingSpeedChanges).forEach(([side, value]) => {
      sendCommand({
        type: "SET_SPEED",
        payload: {
          side,
          value,
        },
      });
    });
    setHasUnsavedChanges(false);
    setPendingSpeedChanges({});
    setShowUnsavedDialog(false);
  };

  const handleDiscardChanges = () => {
    setPendingSpeedChanges({});
    setHasUnsavedChanges(false);
    setShowUnsavedDialog(false);
  };

  const isPaused = status.state === "PAUSED";

  // SHOW BUTTONS
  const showStartButton = status.state == "HOMED";
  const showPauseButton =
    status.state == "EXECUTING_PATTERN" ||
    status.state == "HOMING_X" ||
    status.state == "HOMING_Y" ||
    status.state == "PAINTING_SIDE";
  const showStopButton =
    status.state == "DEPRESSURIZE_POT" ||
    status.state == "CLEANING" ||
    status.state == "EXECUTING_PATTERN" ||
    status.state == "HOMING_X" ||
    status.state == "HOMING_Y" ||
    status.state == "PAINTING_SIDE";
  const showPrimeButton = status.state == "STOPPED" || status.state == "HOMED";
  const showCleanButton = status.state == "STOPPED" || status.state == "HOMED";
  const showHomeButton = status.state !== "HOMED";

  return (
    <div className="min-h-screen">
      <RoboTylerHeader
        status={status}
        wsConnected={wsConnected}
        handleEmergencyStop={handleEmergencyStop}
        reconnectAttempts={reconnectAttempts.current}
        MAX_RECONNECT_ATTEMPTS={MAX_RECONNECT_ATTEMPTS}
        handleReconnect={handleReconnect}
        hasExceededReconnectAttempts={
          reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS
        }
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
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md transition-all duration-200"
                    onClick={() => sendCommand({ type: "HOME_SYSTEM" })}
                    disabled={!showHomeButton || !wsConnected}
                  >
                    <Home className="mr-2" size={18} />
                    Home System
                  </Button>
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
                    className={`w-full bg-gradient-to-r ${
                      status.pressurePotActive
                        ? "from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                        : "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    } text-white shadow-md transition-all duration-200`}
                    onClick={() => sendCommand({ type: "TOGGLE_PRESSURE_POT" })}
                    disabled={
                      !(
                        status.state === "STOPPED" || status.state === "HOMED"
                      ) || !wsConnected
                    }
                  >
                    <Zap className="mr-2" size={18} />
                    {status.pressurePotActive
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
                <div className="grid grid-cols-3 gap-4">
                  <Button
                    onClick={() => sendCommand({ type: "START_PAINTING" })}
                    disabled={!showStartButton || !wsConnected}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md transition-all duration-200"
                  >
                    <Play className="mr-2" size={18} />
                    Start
                  </Button>
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

          {/* Tray Visualization - Full Width */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <TrayVisualization
              status={status}
              className="w-full"
              onSideClick={(side) => sendCommand({ type: `PAINT_${side}` })}
            />
          </div>

          {/* Combined Speed & Movement Controls */}
          <CombinedControls
            status={status}
            pendingSpeedChanges={pendingSpeedChanges}
            handleSpeedChange={handleSpeedChange}
            handleRotate={handleRotate}
            handleSaveChanges={handleSaveChanges}
            wsConnected={wsConnected}
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
