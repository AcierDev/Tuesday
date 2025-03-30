"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Grid2x2 } from "lucide-react";
import { toast } from "sonner";
import PickNPlaceHeader from "@/components/pick-n-place/PickNPlaceHeader";
import { MovementControls } from "@/components/pick-n-place/MovementControls";
import { OperationControls } from "@/components/pick-n-place/OperationControls";
import { GridSizeSettings } from "@/components/pick-n-place/GridSizeSettings";

export interface SystemState {
  status: "IDLE" | "RUNNING" | "PAUSED" | "ERROR" | "HOMING" | "STOPPED";
  error?: string;
  position?: {
    x: number;
    y: number;
    timestamp?: number;
  };
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
  isSuctionActive?: boolean;
  isExtended?: boolean;
}

export default function PickNPlacePage() {
  const [wsConnected, setWsConnected] = useState(false);
  const [wsIp, setWsIp] = useState("localhost:8080");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const [status, setStatus] = useState<SystemState>({
    status: "IDLE",
  });
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds
  const [gridRows, setGridRows] = useState(3);
  const [gridColumns, setGridColumns] = useState(3);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [gridLength, setGridLength] = useState(0);
  const [gridWidth, setGridWidth] = useState(0);
  const [pickupX, setPickupX] = useState(0);
  const [pickupY, setPickupY] = useState(0);

  const handleMessage = useCallback((message: any) => {
    try {
      const data = JSON.parse(message.data);
      if (data.type === "STATUS_UPDATE") {
        setStatus(data.payload);
      }
    } catch (error) {
      console.error("Failed to parse message:", error);
    }
  }, []);

  // Clean up WebSocket connections
  const cleanupWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null; // Remove close handler to prevent reconnection
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    setWsConnected(false);
  }, []);

  // Initialize WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      cleanupWebSocket();

      const ws = new WebSocket(`ws://${wsIp}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setWsConnected(true);
        reconnectAttemptsRef.current = 0;
        toast.success("Connected to machine");

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "PING" }));
          }
        }, HEARTBEAT_INTERVAL);
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected", event.code, event.reason);
        setWsConnected(false);
        cleanupWebSocket();
        toast.error("Disconnected from machine", {
          description: "Attempting to reconnect...",
        });

        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          console.log(
            `Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, RECONNECT_DELAY);
        } else {
          console.log("Max reconnection attempts reached");
          toast.error("Connection failed", {
            description:
              "Maximum reconnection attempts reached. Please try again manually.",
          });
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onmessage = handleMessage;

      return ws;
    } catch (error) {
      console.error("Failed to connect:", error);
      cleanupWebSocket();
      return null;
    }
  }, [wsIp, cleanupWebSocket]);

  // Update useEffect to handle cleanup properly
  useEffect(() => {
    connectWebSocket();
    return () => cleanupWebSocket();
  }, [connectWebSocket, cleanupWebSocket]);

  const handleReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connectWebSocket();
  }, [connectWebSocket]);

  const sendCommand = useCallback(
    (command: { type: string; payload?: any }) => {
      console.log("Attempting to send command:", command);

      if (!wsConnected) {
        console.log("Command failed - not connected to machine");
        toast.error("Not connected to machine");
        return;
      }

      try {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          console.log(
            "Sending command via WebSocket:",
            JSON.stringify(command)
          );
          wsRef.current.send(JSON.stringify(command));
          console.log("Command sent successfully");
        } else {
          console.log("Command failed - WebSocket not in OPEN state", {
            readyState: wsRef.current?.readyState,
            wsRef: wsRef.current ? "exists" : "null",
          });
          toast.error("WebSocket connection lost");
        }
      } catch (error) {
        console.error("Failed to send command:", error);
        console.log("Command details:", {
          type: command.type,
          payload: command.payload,
          wsState: wsRef.current?.readyState,
        });
        toast.error("Failed to send command");
      }
    },
    [wsConnected]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PickNPlaceHeader
        status={status}
        wsConnected={wsConnected}
        reconnectAttempts={reconnectAttemptsRef.current}
        MAX_RECONNECT_ATTEMPTS={MAX_RECONNECT_ATTEMPTS}
        handleReconnect={handleReconnect}
        onSelectComputer={setWsIp}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-6">
          {/* Operation Controls Card */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Play className="w-5 h-5 text-green-500" />
                  Operation Controls
                </h3>
              </div>
              <OperationControls
                wsConnected={wsConnected}
                sendCommand={sendCommand}
                gridRows={gridRows}
                gridColumns={gridColumns}
                startX={startX}
                startY={startY}
                gridLength={gridLength}
                gridWidth={gridWidth}
                pickupX={pickupX}
                pickupY={pickupY}
              />
            </div>
          </Card>

          {/* Movement Controls Card */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 lg:col-span-2">
            <div className="p-6">
              <MovementControls
                wsConnected={wsConnected}
                sendCommand={sendCommand}
                position={status.position}
                limitSwitches={status.limitSwitches}
                isHomed={status.status === "HOMING"}
                isSuctionActive={status.isSuctionActive}
                isExtended={status.isExtended}
                gridRows={gridRows}
                gridColumns={gridColumns}
                onGridRowsChange={setGridRows}
                onGridColumnsChange={setGridColumns}
                startX={startX}
                startY={startY}
                onStartXChange={setStartX}
                onStartYChange={setStartY}
                gridLength={gridLength}
                gridWidth={gridWidth}
                onGridLengthChange={setGridLength}
                onGridWidthChange={setGridWidth}
                pickupX={pickupX}
                pickupY={pickupY}
                onPickupXChange={setPickupX}
                onPickupYChange={setPickupY}
              />
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
