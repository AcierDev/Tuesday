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
import ImprovedEjectionControlGUI from "@/components/router/ejection/EjectionControls";

const MAX_RECONNECT_ATTEMPTS = 5;

const EmptyLogs = () => (
  <div className="flex flex-col items-center justify-center h-[200px] text-center">
    <Terminal className="w-12 h-12 mb-4 opacity-50 text-gray-400 dark:text-gray-500" />
    <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
      No System Logs
    </p>
    <p className="text-xs text-gray-400 dark:text-gray-500">
      System logs will appear here when available
    </p>
  </div>
);

export default function MonitoringDashboard() {
  const { status, logs, connectionStatus, connectionError, reconnectAttempts } =
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
            Last updated: {status.lastUpdate.toLocaleTimeString()}
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-50">
              System Status
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              Real-time sensor and device status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatusCard
                title="Sensor 1"
                status={status.sensor1}
                icon={Circle}
                description={status.sensor1 ? "Active" : "Inactive"}
              />
              <StatusCard
                title="Sensor 2"
                status={status.sensor2}
                icon={Circle}
                description={status.sensor2 ? "Active" : "Inactive"}
              />
              <StatusCard
                title="Solenoid"
                status={status.solenoid}
                icon={Power}
                description={status.solenoid ? "Engaged" : "Disengaged"}
              />
              <StatusCard
                title="Ejection"
                status={status.ejection}
                icon={Power}
                description={status.solenoid ? "Engaged" : "Disengaged"}
              />
              <StatusCard
                title="Camera"
                status={status.deviceConnected}
                icon={Camera}
                description={
                  status.deviceConnected ? "Connected" : "Disconnected"
                }
              />
            </div>

            {/* System Logs Section */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-50">
                System Logs
              </h3>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
                <ScrollArea
                  className="h-[250px]"
                  viewportClassName="dark:bg-gray-800"
                >
                  <div className="space-y-2 p-4">
                    {logs.length > 0 ? (
                      logs.map((log) => <LogEntry key={log.id} log={log} />)
                    ) : (
                      <EmptyLogs />
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>

        <ImageAnalysisCard
          imageUrl={status.currentImageUrl}
          imageMetadata={status.currentImageMetadata}
          analysis={status.currentAnalysis}
          isCapturing={status.isCapturingImage}
        />
      </div>

      {/* Ejection Controls Card */}
      <ImprovedEjectionControlGUI />
    </div>
  );
}
