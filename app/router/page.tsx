"use client";

import React from "react";
import { Toaster } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Circle,
  Camera,
  Power,
  AlertTriangle,
  Activity,
  Terminal,
} from "lucide-react";
import { StatusBadge } from "@/components/router/StatusBadge";
import { StatusCard } from "@/components/router/StatusCard";
import { LogEntry } from "@/components/router/LogEntry";
import { useWebSocketManager } from "@/hooks/useWebsocket";
import ImageAnalysisCard from "@/components/router/ImageAnalysisCard";
import ImprovedEjectionControlGUI from "@/components/router/settings/EjectionControls";
import { EmptyLogs } from "@/utils/functions";

const MAX_RECONNECT_ATTEMPTS = 5;

export default function MonitoringDashboard() {
  const { state, logs, connectionStatus, connectionError, reconnectAttempts } =
    useWebSocketManager();

  const renderConnectionAlert = () => {
    if (connectionError) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{connectionError}</AlertDescription>
        </Alert>
      );
    }
    if (connectionStatus === "disconnected" && reconnectAttempts > 0) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Connection lost. Attempting to reconnect... (Attempt{" "}
            {reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS})
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <Toaster position="top-center" />

      {/* Header with Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            System Monitor
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Last updated: {state.lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={connectionStatus} />
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Activity className="w-4 h-4" />
            <span className="font-medium">System Status</span>
          </div>
        </div>
      </div>

      {renderConnectionAlert()}

      {/* Main Content - Restructured Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Status Cards Grid */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-50">
              System Status
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              Real-time sensor and device status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatusCard
                title="Block Sensor"
                status={state.sensor1.active}
                icon={Circle}
                description={state.sensor1 ? "Active" : "Inactive"}
              />
              <StatusCard
                title="Piston"
                status={state.piston.active}
                icon={Power}
                description={state.piston ? "Engaged" : "Disengaged"}
              />
              <StatusCard
                title="Riser"
                status={state.riser.active}
                icon={Power}
                description={state.riser ? "Engaged" : "Disengaged"}
              />
              <StatusCard
                title="Ejector"
                status={state.ejector.active}
                icon={Power}
                description={state.ejector ? "Engaged" : "Disengaged"}
              />
              <StatusCard
                title="Camera"
                status={state.deviceConnected}
                icon={Camera}
                description={
                  state.deviceConnected ? "Connected" : "Disconnected"
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Enlarged Image Analysis Card */}
        <div className="xl:row-span-2">
          <ImageAnalysisCard
            imageUrl={state.currentImageUrl}
            imageMetadata={state.currentImageMetadata}
            analysis={state.currentAnalysis}
            isCapturing={state.isCapturingImage}
          />
        </div>

        {/* System Logs Card */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-50">
              System Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea
              className="h-[300px]"
              viewportClassName="dark:bg-gray-800"
            >
              <div className="space-y-2">
                {logs.length > 0 ? (
                  logs.map((log) => <LogEntry key={log.id} log={log} />)
                ) : (
                  <EmptyLogs />
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Ejection Controls Card */}
      <ImprovedEjectionControlGUI />
    </div>
  );
}
