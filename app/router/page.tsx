"use client";

import React, { useState, useEffect } from "react";
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
  Wifi,
  WifiOff,
  BarChart3,
} from "lucide-react";
import { StatusBadge } from "@/components/router/StatusBadge";
import { StatusCard } from "@/components/router/StatusCard";
import { LogEntry } from "@/components/router/LogEntry";
import { useWebSocketManager } from "@/hooks/useRouterWebsocket";
import ImageAnalysisCard from "@/components/router/ImageAnalysisCard";
import ImprovedEjectionControlGUI from "@/components/router/settings/EjectionControls";
import { EmptyLogs } from "@/utils/functions";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const MAX_RECONNECT_ATTEMPTS = 5;

export default function MonitoringDashboard() {
  const { state, logs, connectionStatus, connectionError, reconnectAttempts } =
    useWebSocketManager();
  const [activeTab, setActiveTab] = useState("logs");

  // Add state for image processing
  const [currentImage, setCurrentImage] = useState<{
    url: string | null;
    metadata: ImageMetadata | null;
  }>({
    url: null,
    metadata: null,
  });

  // Update image when new analysis image is received
  useEffect(() => {
    if (state.currentImageUrl) {
      setCurrentImage({
        url: state.currentImageUrl,
        metadata: state.currentImageMetadata || null,
      });
    }
  }, [state.currentImageUrl, state.currentImageMetadata]);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 mb-4 lg:mb-6 lg:z-50">
        <div className="container mx-auto px-4 py-3 lg:py-4 mt-14 lg:mt-0">
          <div className="w-full flex flex-wrap items-start lg:items-center justify-between gap-2 lg:gap-4">
            <div className="flex flex-col">
              <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Router Control System
              </h1>
              <p className="hidden lg:block text-xs lg:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Monitor and control the router system
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full dark:bg-blue-900/30`}
              >
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {state.router_state}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-sm ${
                    connectionStatus === "connected"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  }`}
                >
                  {connectionStatus === "connected" ? (
                    <Wifi className="h-4 w-4" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {connectionStatus === "connected"
                      ? "Connected"
                      : "Disconnected"}
                  </span>
                </div>
              </div>

              <Button
                variant="destructive"
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 h-12 text-sm"
                onClick={() => {
                  /* Add emergency stop handler */
                }}
                disabled={connectionStatus !== "connected"}
              >
                <AlertTriangle className="mr-2 h-5 w-5" />
                Emergency Stop
              </Button>
            </div>
          </div>

          {!connectionStatus && reconnectAttempts > 0 && (
            <Alert className="mt-3 lg:mt-4 border-2 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs lg:text-sm">
                <span>
                  {reconnectAttempts >= MAX_RECONNECT_ATTEMPTS
                    ? "Connection failed after multiple attempts."
                    : `Attempting to connect... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`}
                </span>
                {reconnectAttempts >= MAX_RECONNECT_ATTEMPTS && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      /* Add reconnect handler */
                    }}
                    className="mt-2 sm:mt-0 border-yellow-500 text-yellow-500 hover:bg-yellow-50 text-xs lg:text-sm px-2 py-1 h-7 lg:h-8"
                  >
                    Try Again
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {renderConnectionAlert()}

        <div className="grid gap-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Image Analysis Card */}
            <ImageAnalysisCard
              imageUrl={currentImage.url}
              imageMetadata={currentImage.metadata}
              analysis={state.currentAnalysis}
              isCapturing={state.isCapturing}
            />

            {/* Status Cards */}
            <div className="space-y-6">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    System Status
                  </CardTitle>
                  <CardDescription>
                    Real-time sensor and device status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <StatusCard
                      title="Block Sensor"
                      status={state.sensor1 === "ON"}
                      icon={Circle}
                      description={
                        state.sensor1 === "ON" ? "Active" : "Inactive"
                      }
                    />
                    <StatusCard
                      title="Push Cylinder"
                      status={state.push_cylinder === "ON"}
                      icon={Power}
                      description={
                        state.push_cylinder === "ON" ? "Engaged" : "Disengaged"
                      }
                    />
                    <StatusCard
                      title="Riser Cylinder"
                      status={state.riser_cylinder === "ON"}
                      icon={Power}
                      description={
                        state.riser_cylinder === "ON" ? "Engaged" : "Disengaged"
                      }
                    />
                    <StatusCard
                      title="Ejection Cylinder"
                      status={state.ejection_cylinder === "ON"}
                      icon={Power}
                      description={
                        state.ejection_cylinder === "ON"
                          ? "Engaged"
                          : "Disengaged"
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* System Logs Card */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 pt-4">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      System Monitor
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1 mt-4 border-b border-gray-200 dark:border-gray-700">
                    {[
                      { id: "logs", label: "System Logs", icon: Terminal },
                      { id: "stats", label: "System Stats", icon: BarChart3 },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                          activeTab === tab.id
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        }`}
                      >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                        {activeTab === tab.id && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                            initial={false}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[250px] relative">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0"
                      >
                        {activeTab === "logs" ? (
                          <ScrollArea className="h-full">
                            <div className="space-y-2">
                              {logs.length > 0 ? (
                                logs.map((log) => (
                                  <LogEntry key={log.id} log={log} />
                                ))
                              ) : (
                                <EmptyLogs />
                              )}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="h-full flex items-center">
                            <div className="grid grid-cols-2 gap-3 w-full">
                              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                  Uptime
                                </div>
                                <div className="text-xl font-semibold">
                                  {state.uptime || "00:00:00"}
                                </div>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                  CPU Usage
                                </div>
                                <div className="text-xl font-semibold">
                                  {state.cpuUsage || "0"}%
                                </div>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                  Memory Usage
                                </div>
                                <div className="text-xl font-semibold">
                                  {state.memoryUsage || "0"}%
                                </div>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                  Temperature
                                </div>
                                <div className="text-xl font-semibold">
                                  {state.temperature || "0"}°C
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Ejection Controls */}
          <ImprovedEjectionControlGUI />
        </div>
      </main>
      <Toaster position="top-center" />
    </div>
  );
}
