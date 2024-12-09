"use client";

import LiveView from "@/components/router/LiveView";
import ImprovedEjectionControlGUI from "@/components/router/settings/EjectionControls";
import StatsOverview from "@/components/router/stats/StatsOverview";
import { StatusCard } from "@/components/router/StatusCard";
import ComputerSelector from "@/components/tyler/ComputerSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { RouterProvider, useRouter } from "@/contexts/RouterContext";
import { ImageMetadata } from "@/typings/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Circle,
  Power,
  Activity,
  Wifi,
  WifiOff,
  Settings2,
  BarChart2,
  Target,
  ToggleRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";

export default function RouterPage() {
  return (
    <RouterProvider>
      <MonitoringDashboard />
    </RouterProvider>
  );
}

const MAX_RECONNECT_ATTEMPTS = 3;

function MonitoringDashboard() {
  const {
    state,
    logs,
    connectionStatus,
    connectionError,
    reconnectAttempts,
    updateWebSocketUrl,
    wsUrl,
    updateEjectionSettings,
  } = useRouter();
  const [activeTab, setActiveTab] = useState("live");

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

  const handleComputerSelect = (ip: string) => {
    updateWebSocketUrl(ip);
  };

  const handleReconnect = () => {
    updateWebSocketUrl(wsUrl);
  };

  const handleAnalysisModeToggle = (enabled: boolean) => {
    if (state.settings) {
      const newSettings = {
        ...state.settings,
        slave: {
          ...state.settings.slave,
          analysisMode: enabled,
        },
      };
      updateEjectionSettings(newSettings);
    }
  };

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

  const renderStatusCards = () => (
    <AnimatePresence>
      {activeTab !== "live" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <StatusCard
            title="Block Sensor"
            status={state.sensor1 === "ON"}
            icon={Circle}
            description={state.sensor1 === "ON" ? "Active" : "Inactive"}
            isActive={state.sensor1 === "ON"}
            activeColor="green"
          />
          <StatusCard
            title="Push Cylinder"
            status={state.push_cylinder === "ON"}
            icon={Power}
            description={
              state.push_cylinder === "ON" ? "Engaged" : "Disengaged"
            }
            duration={state.settings?.slave.pushTime}
            isActive={state.push_cylinder === "ON"}
          />
          <StatusCard
            title="Riser Cylinder"
            status={state.riser_cylinder === "ON"}
            icon={Power}
            description={
              state.riser_cylinder === "ON" ? "Engaged" : "Disengaged"
            }
            duration={state.settings?.slave.riserTime}
            isActive={state.riser_cylinder === "ON"}
          />
          <StatusCard
            title="Ejection Cylinder"
            status={state.ejection_cylinder === "ON"}
            icon={Power}
            description={
              state.ejection_cylinder === "ON" ? "Engaged" : "Disengaged"
            }
            duration={state.settings?.slave.ejectionTime}
            isActive={state.ejection_cylinder === "ON"}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

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
              <ComputerSelector
                onSelect={handleComputerSelect}
                onReconnect={handleReconnect}
                isConnecting={connectionStatus === "connecting"}
                computers={[
                  { name: "Router Raspi", ip: "192.168.1.215:8080/ws" },
                  { name: "Dev Testing Raspi", ip: "192.168.1.216:8080/ws" },
                  { name: "Bentzi's Laptop", ip: "192.168.1.222:8080/ws" },
                  { name: "localhost", ip: "localhost:8080/ws" },
                ]}
              />

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

              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Analysis Mode</span>
                <ToggleRight
                  checked={state.settings?.slave.analysisMode}
                  onCheckedChange={handleAnalysisModeToggle}
                  className="data-[state=checked]:bg-blue-600"
                />
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

        {renderStatusCards()}

        <AnimatedTabs
          id="router-tabs"
          tabs={[
            {
              id: "live",
              label: "Live View",
              icon: Activity,
              description: "Monitor real-time system status and operations",
            },
            {
              id: "settings",
              label: "Settings",
              icon: Settings2,
              description: "Configure system parameters and controls",
            },
            {
              id: "stats",
              label: "Statistics",
              icon: BarChart2,
              description: "View system performance metrics and analytics",
            },
          ]}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          variant="card"
          className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border dark:border-gray-700"
          tabClassName="px-6 py-4 text-base font-semibold hover:bg-gray-100 dark:hover:bg-gray-700/50 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 rounded-t-lg transition-all duration-200"
          contentClassName="p-6 bg-white dark:bg-gray-800 rounded-b-lg"
          tabListClassName="bg-gray-50 dark:bg-gray-800 p-2 rounded-t-lg gap-2"
        >
          <div key="live">
            <LiveView currentImage={currentImage} state={state} logs={logs} />
          </div>

          <div key="settings">
            <ImprovedEjectionControlGUI />
          </div>

          <div key="stats">
            <StatsOverview
              dailyStats={state.dailyStats}
              currentCycleStats={state.currentCycleStats}
            />
          </div>
        </AnimatedTabs>
      </main>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-6 left-6 z-50"
      >
        <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg p-4 flex items-center gap-3 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium">Analysis Mode</span>
            <span className="text-xs text-gray-500">
              {state.settings?.slave.analysisMode ? "Enabled" : "Disabled"}
            </span>
          </div>
          <ToggleRight
            checked={state.settings?.slave.analysisMode}
            onCheckedChange={handleAnalysisModeToggle}
            className="data-[state=checked]:bg-blue-600"
          />
          <motion.div
            animate={{
              scale: state.settings?.slave.analysisMode ? [1, 1.2, 1] : 1,
            }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className={`absolute inset-0 rounded-full ${
              state.settings?.slave.analysisMode
                ? "border-2 border-blue-500/50"
                : ""
            }`}
          />
        </div>
      </motion.div>
      <Toaster position="top-center" />
    </div>
  );
}
