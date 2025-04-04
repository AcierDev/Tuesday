"use client";

import LiveView from "@/components/router/LiveView";
import ImprovedEjectionControlGUI from "@/components/router/settings/EjectionControls";
import StatsOverview from "@/components/router/stats/StatsOverview";
import HistoryView from "@/components/router/HistoryView";
import EjectionInsights from "@/components/router/insights/EjectionInsights";
import ComputerSelector from "@/components/robotyler/ComputerSelector";
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
  Settings2,
  BarChart2,
  History,
  RotateCw,
  Shield,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StatusCard } from "@/components/shared/StatusCard";

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
    historicalImages,
  } = useRouter();
  const [activeTab, setActiveTab] = useState("live");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Check if mobile
  const isMobile =
    typeof window !== "undefined" ? window.innerWidth < 768 : false;

  // Create a stable, memoized reference for the LiveView component
  const [tabsInitialized, setTabsInitialized] = useState(false);

  // Add state for image processing
  const [currentImage, setCurrentImage] = useState<{
    url: string | null;
    metadata: ImageMetadata | null;
  }>({
    url: null,
    metadata: null,
  });

  // Handle mobile resize
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        setShowMobileMenu(window.innerWidth < 768);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update image when new analysis image is received
  useEffect(() => {
    if (state.currentImageUrl) {
      setCurrentImage({
        url: state.currentImageUrl,
        metadata: state.currentImageMetadata || null,
      });
    }
  }, [state.currentImageUrl, state.currentImageMetadata]);

  // Mark tabs as initialized after the first render
  useEffect(() => {
    setTabsInitialized(true);
  }, []);

  const handleComputerSelect = (ip: string) => {
    updateWebSocketUrl(ip);
  };

  const handleReconnect = () => {
    updateWebSocketUrl(wsUrl);
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
            title="Flipper"
            status={state.flipper === "ON"}
            icon={RotateCw}
            description={state.flipper === "ON" ? "Engaged" : "Disengaged"}
            duration={state.settings?.slave.flipperDuration}
            isActive={state.flipper === "ON"}
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

  // Mobile-specific bottom tab navigation
  const MobileTabNavigation = () => (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg z-50"
    >
      <div className="flex justify-around items-center h-16">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveTab("live")}
          className={`flex flex-col items-center justify-center w-full h-full ${
            activeTab === "live"
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <Activity className="h-5 w-5 mb-1" />
          <span className="text-xs">Live</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveTab("insights")}
          className={`flex flex-col items-center justify-center w-full h-full ${
            activeTab === "insights"
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <Shield className="h-5 w-5 mb-1" />
          <span className="text-xs">Insights</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center justify-center w-full h-full ${
            activeTab === "history"
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <History className="h-5 w-5 mb-1" />
          <span className="text-xs">History</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center justify-center w-full h-full ${
            activeTab === "settings"
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <Settings2 className="h-5 w-5 mb-1" />
          <span className="text-xs">Settings</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveTab("stats")}
          className={`flex flex-col items-center justify-center w-full h-full ${
            activeTab === "stats"
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <BarChart2 className="h-5 w-5 mb-1" />
          <span className="text-xs">Stats</span>
        </motion.button>
      </div>
    </motion.div>
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

            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full dark:bg-blue-900/30`}
              >
                <Activity className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-medium">
                  {state.router_state}
                </span>
              </div>
              <ComputerSelector
                onSelect={handleComputerSelect}
                onReconnect={handleReconnect}
                isConnecting={connectionStatus === "connecting"}
                connectionStatus={
                  connectionStatus === "connected"
                    ? "connected"
                    : "disconnected"
                }
                computers={[
                  { name: "Router Raspi", ip: "192.168.1.243:8080/ws" },
                  { name: "Bentzi's Laptop", ip: "192.168.1.229:8080/ws" },
                  { name: "Dev Testing Raspi", ip: "192.168.1.216:8080/ws" },
                  { name: "localhost", ip: "localhost:8080/ws" },
                ]}
              />
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

      <main className="container mx-auto px-4 py-4 pb-20 md:pb-6 md:py-6">
        {renderConnectionAlert()}

        {renderStatusCards()}

        {/* Desktop Tabs - Hidden on Mobile */}
        <div className="hidden md:block">
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
                id: "insights",
                label: "Ejection Insights",
                icon: Shield,
                description:
                  "Understand ejection decisions and defect analysis in detail",
              },
              {
                id: "history",
                label: "History",
                icon: History,
                description:
                  "Browse through historical images and analysis results",
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
            tabClassName="px-3 py-3 md:px-6 md:py-4 text-sm md:text-base font-medium md:font-semibold hover:bg-gray-100 dark:hover:bg-gray-700/50 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 rounded-t-lg transition-all duration-200"
            contentClassName="p-3 md:p-6 bg-white dark:bg-gray-800 rounded-b-lg"
            tabListClassName="flex md:inline-flex flex-nowrap overflow-x-auto no-scrollbar bg-gray-50 dark:bg-gray-800 p-2 rounded-t-lg gap-1 md:gap-2"
          >
            {/* Use a stable key for each tab content to ensure they're preserved */}
            <div key="live-tab-content">
              {tabsInitialized && (
                <LiveView
                  key="live-view-component"
                  currentImage={currentImage}
                  state={state}
                  logs={logs}
                  historicalImages={historicalImages}
                />
              )}
            </div>

            <div key="insights-tab-content">
              <EjectionInsights
                state={state}
                currentImage={currentImage}
                historicalImages={historicalImages}
              />
            </div>

            <div key="history-tab-content">
              <HistoryView historicalImages={historicalImages} />
            </div>

            <div key="settings-tab-content">
              <ImprovedEjectionControlGUI />
            </div>

            <div key="stats-tab-content">
              <StatsOverview
                dailyStats={state.dailyStats}
                currentCycleStats={state.currentCycleStats}
              />
            </div>
          </AnimatedTabs>
        </div>

        {/* Mobile Content - Hidden on Desktop */}
        <div className="md:hidden">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border dark:border-gray-700 overflow-hidden">
            {/* Mobile Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-3"
              >
                {activeTab === "live" && tabsInitialized && (
                  <LiveView
                    key="live-view-component"
                    currentImage={currentImage}
                    state={state}
                    logs={logs}
                    historicalImages={historicalImages}
                  />
                )}

                {activeTab === "insights" && (
                  <EjectionInsights
                    state={state}
                    currentImage={currentImage}
                    historicalImages={historicalImages}
                  />
                )}

                {activeTab === "history" && (
                  <HistoryView historicalImages={historicalImages} />
                )}

                {activeTab === "settings" && <ImprovedEjectionControlGUI />}

                {activeTab === "stats" && (
                  <StatsOverview
                    dailyStats={state.dailyStats}
                    currentCycleStats={state.currentCycleStats}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <MobileTabNavigation />
      </main>
    </div>
  );
}
