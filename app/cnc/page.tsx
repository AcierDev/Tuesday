"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Home,
  AlertCircle,
  Wifi,
  WifiOff,
  RotateCcw,
  Save,
} from "lucide-react";
import React from "react";
import { MachineStatus } from "@/typings/types";
import { StatusDisplay } from "@/components/cnc/StatusDisplay";
import { MachineControls } from "@/components/cnc/MachineControls";
import { PositionPlot } from "@/components/cnc/PositionPlot";
import { StepControl } from "@/components/cnc/StepControl";

export default function Component() {
  const [status, setStatus] = useState<MachineStatus>({
    state: "IDLE",
    position: { x: 0, y: 0 },
    speed: 1000,
    accel: 500,
  });
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [moveDistance, setMoveDistance] = useState(1);
  const [plotSize, setPlotSize] = useState({ width: 400, height: 400 });
  const [plotRange, setPlotRange] = useState({ x: 100, y: 100 });

  useEffect(() => {
    const ws = new WebSocket("ws://192.168.1.216:3000");

    ws.onopen = () => {
      console.log("Connected to CNC server");
      setIsConnected(true);
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "status") {
        setStatus(data.payload);
      }
    };
    ws.onerror = (error) => console.error("WebSocket error:", error);
    ws.onclose = () => {
      console.log("Disconnected from CNC server");
      setIsConnected(false);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const sendCommand = useCallback(
    (type: string, payload: any) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, payload }));
      }
    },
    [socket]
  );

  const move = (dx: number, dy: number) => {
    const newX = status.position.x + dx * moveDistance;
    const newY = status.position.y + dy * moveDistance;
    sendCommand("move", { x: newX, y: newY });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">CNC Controller</CardTitle>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <div className="flex items-center space-x-2 text-green-500">
                  <Wifi className="w-5 h-5" />
                  <span>Connected</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-red-500">
                  <WifiOff className="w-5 h-5" />
                  <span>Reconnecting...</span>
                </div>
              )}
            </div>
          </div>
          <CardDescription>Machine Control Interface</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="control" className="space-y-6">
            <TabsList>
              <TabsTrigger value="control">Control</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="step-control">Step Control</TabsTrigger>
            </TabsList>

            <TabsContent value="control" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <StatusDisplay status={status} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Controls</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MachineControls
                        onMove={move}
                        onHome={() => sendCommand("home", {})}
                        moveDistance={moveDistance}
                        setMoveDistance={setMoveDistance}
                        position={status.position}
                        sendCommand={sendCommand}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Position</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PositionPlot
                      position={status.position}
                      plotSize={plotSize}
                      plotRange={plotRange}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="step-control">
              <StepControl sendCommand={sendCommand} />
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Machine Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Speed: {status.speed} mm/min
                    </h3>
                    <Slider
                      min={100}
                      max={50000}
                      step={100}
                      value={[status.speed]}
                      onValueChange={(value) =>
                        sendCommand("speed", { speed: value[0] })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Acceleration: {status.accel} mm/s²
                    </h3>
                    <Slider
                      min={100}
                      max={10000}
                      step={100}
                      value={[status.accel]}
                      onValueChange={(value) =>
                        sendCommand("accel", { accel: value[0] })
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">
                        Direct Position Control
                      </h3>
                      <div className="space-y-4">
                        <Input
                          type="number"
                          placeholder="X position"
                          onChange={(e) =>
                            sendCommand("move", {
                              x: parseFloat(e.target.value),
                              y: status.position.y,
                            })
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Y position"
                          onChange={(e) =>
                            sendCommand("move", {
                              x: status.position.x,
                              y: parseFloat(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">Plot Range</h3>
                      <div className="space-y-4">
                        <Input
                          type="number"
                          value={plotRange.x}
                          onChange={(e) =>
                            setPlotRange({
                              ...plotRange,
                              x: parseFloat(e.target.value),
                            })
                          }
                          placeholder="X range"
                        />
                        <Input
                          type="number"
                          value={plotRange.y}
                          onChange={(e) =>
                            setPlotRange({
                              ...plotRange,
                              y: parseFloat(e.target.value),
                            })
                          }
                          placeholder="Y range"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Connection Settings
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <div>
                          <div className="font-medium">WebSocket Status</div>
                          <div className="text-sm text-gray-500">
                            ws://localhost:3000
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => window.location.reload()}
                          className="flex items-center space-x-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Reconnect</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Emergency Stop Button - Always visible */}
          <div className="mt-6">
            <Button
              variant="destructive"
              className="w-full h-16 text-lg font-bold"
              onClick={() => sendCommand("emergency_stop", {})}
            >
              EMERGENCY STOP
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Command History Log */}
      <Card className="max-w-5xl mx-auto mt-6">
        <CardHeader>
          <CardTitle>Command History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 overflow-y-auto space-y-2 font-mono text-sm">
            {/* Add command history items here */}
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
              Moving to position (X: 10.0, Y: 20.0)
            </div>
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
              Speed changed to 1000 mm/min
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toast notifications for important events */}
      <div className="fixed bottom-4 right-4 space-y-2">
        {status.state === "ERROR" && (
          <Alert variant="destructive" className="w-72">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{status.error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

// Add command history context
const CommandHistoryContext = React.createContext<{
  history: string[];
  addCommand: (command: string) => void;
}>({
  history: [],
  addCommand: () => {},
});

// Add websocket context
const WebSocketContext = React.createContext<{
  socket: WebSocket | null;
  isConnected: boolean;
  sendCommand: (type: string, payload: any) => void;
}>({
  socket: null,
  isConnected: false,
  sendCommand: () => {},
});

// Add machine context
const MachineContext = React.createContext<{
  status: MachineStatus;
  updateStatus: (status: MachineStatus) => void;
}>({
  status: {
    state: "IDLE",
    position: { x: 0, y: 0 },
    speed: 1000,
    accel: 500,
  },
  updateStatus: () => {},
});
