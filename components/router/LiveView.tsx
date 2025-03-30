import React, { memo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogEntry } from "@/components/router/LogEntry";
import ImageAnalysisCard from "@/components/router/ImageAnalysisCard";
import { EmptyLogs } from "@/utils/functions";
import {
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { ImageMetadata } from "@/typings/types";
import { StatusCard } from "@/components/shared/StatusCard";
import { Circle, Power, RotateCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface RouterState {
  currentImageUrl: string | null;
  currentImageMetadata: ImageMetadata | null;
  currentAnalysis: any | null;
  isCapturing: boolean;
  isAnalyzing: boolean;
  ejectionDecision: boolean | null;
  sensor1: string;
  push_cylinder: string;
  flipper: string;
  ejection_cylinder: string;
  settings?: {
    slave: {
      pushTime: number;
      flipperDuration: number;
      ejectionTime: number;
      flipperDelay: number;
    };
  };
}

interface Log {
  id: string;
  timestamp: Date;
  level: "info" | "warning" | "error";
  message: string;
}

interface LiveViewProps {
  currentImage: {
    url: string | null;
    metadata: ImageMetadata | null;
  };
  state: RouterState;
  logs: Log[];
  historicalImages?: {
    url: string;
    metadata: ImageMetadata;
    timestamp: Date;
    analysis?: any;
    ejectionDecision?: boolean | null;
  }[];
}

// Wrap LiveView in React.memo to prevent unnecessary re-renders
const LiveView: React.FC<LiveViewProps> = memo(
  ({ currentImage, state, logs, historicalImages = [] }) => {
    // State for mobile view toggling
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Check if mobile
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };

      checkMobile();
      window.addEventListener("resize", checkMobile);

      return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Create a more stable object for passing to ImageAnalysisCard
    const stableState = React.useMemo(
      () => ({
        currentAnalysis: state.currentAnalysis,
        isCapturing: state.isCapturing,
        isAnalyzing: state.isAnalyzing,
        ejectionDecision: state.ejectionDecision,
      }),
      [
        state.currentAnalysis,
        state.isCapturing,
        state.isAnalyzing,
        state.ejectionDecision,
      ]
    );

    // Toggle expanded section for mobile
    const toggleSection = (section: string) => {
      setExpandedSection(expandedSection === section ? null : section);
    };

    // Render mobile view
    if (isMobile) {
      return (
        <div className="flex flex-col space-y-4">
          {/* Image Analysis - Always visible but can be expanded */}
          <Card className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm overflow-hidden">
            <CardHeader className="px-4 py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Image Analysis</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleSection("image")}
                className="h-8 w-8"
              >
                {expandedSection === "image" ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent
              className={`px-4 py-2 ${
                expandedSection === "image"
                  ? ""
                  : "max-h-[300px] overflow-hidden"
              }`}
            >
              <ImageAnalysisCard
                imageUrl={currentImage.url}
                imageMetadata={currentImage.metadata}
                analysis={stableState.currentAnalysis}
                isCapturing={stableState.isCapturing}
                isAnalyzing={stableState.isAnalyzing}
                ejectionDecision={stableState.ejectionDecision}
                historicalImages={historicalImages}
                state={state}
                isMobileView={true}
              />
            </CardContent>
          </Card>

          {/* System Status */}
          <motion.div
            initial={false}
            animate={{
              height: expandedSection === "status" ? "auto" : "56px",
              overflow: expandedSection === "status" ? "visible" : "hidden",
            }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm rounded-lg border"
          >
            <div
              className="px-4 py-3 flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection("status")}
            >
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-blue-500" />
                <h3 className="font-medium">System Status</h3>
              </div>
              <motion.div
                animate={{ rotate: expandedSection === "status" ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-5 w-5 text-gray-500" />
              </motion.div>
            </div>

            <AnimatePresence>
              {expandedSection === "status" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 pb-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <StatusCard
                      title="Block Sensor"
                      status={state.sensor1 === "ON"}
                      icon={Circle}
                      description={
                        state.sensor1 === "ON" ? "Active" : "Inactive"
                      }
                      isActive={state.sensor1 === "ON"}
                      activeColor="green"
                      className="text-xs"
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
                      className="text-xs"
                    />
                    <StatusCard
                      title="Flipper"
                      status={state.flipper === "ON"}
                      icon={RotateCw}
                      description={
                        state.flipper === "ON" ? "Engaged" : "Disengaged"
                      }
                      duration={state.settings?.slave.flipperDuration}
                      isActive={state.flipper === "ON"}
                      className="text-xs"
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
                      duration={state.settings?.slave.ejectionTime}
                      isActive={state.ejection_cylinder === "ON"}
                      className="text-xs"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* System Monitor */}
          <motion.div
            initial={false}
            animate={{
              height: expandedSection === "logs" ? "auto" : "56px",
              overflow: expandedSection === "logs" ? "visible" : "hidden",
            }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm rounded-lg border"
          >
            <div
              className="px-4 py-3 flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection("logs")}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <h3 className="font-medium">System Monitor</h3>
              </div>
              <motion.div
                animate={{ rotate: expandedSection === "logs" ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-5 w-5 text-gray-500" />
              </motion.div>
            </div>

            <AnimatePresence>
              {expandedSection === "logs" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-0 pb-0"
                >
                  <ScrollArea className="h-[240px] px-4">
                    <div className="space-y-2 py-4">
                      {logs.length > 0 ? (
                        logs.map((log) => <LogEntry key={log.id} log={log} />)
                      ) : (
                        <EmptyLogs />
                      )}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      );
    }

    // Desktop view (unchanged)
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Left Column - Image Analysis */}
        <div>
          <ImageAnalysisCard
            imageUrl={currentImage.url}
            imageMetadata={currentImage.metadata}
            analysis={stableState.currentAnalysis}
            isCapturing={stableState.isCapturing}
            isAnalyzing={stableState.isAnalyzing}
            ejectionDecision={stableState.ejectionDecision}
            historicalImages={historicalImages}
            state={state}
          />
        </div>

        {/* Right Column - System Status & Monitor */}
        <div className="space-y-4 md:space-y-6">
          {/* System Status */}
          <Card className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-card">
            <CardHeader className="px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-base md:text-lg">
                System Status
              </CardTitle>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                Real-time sensor and device status
              </p>
            </CardHeader>
            <CardContent className="px-4 py-3 md:px-6 md:py-4">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <StatusCard
                  title="Block Sensor"
                  status={state.sensor1 === "ON"}
                  icon={Circle}
                  description={state.sensor1 === "ON" ? "Active" : "Inactive"}
                  isActive={state.sensor1 === "ON"}
                  activeColor="green"
                  className="text-xs md:text-sm"
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
                  className="text-xs md:text-sm"
                />
                <StatusCard
                  title="Flipper"
                  status={state.flipper === "ON"}
                  icon={RotateCw}
                  description={
                    state.flipper === "ON" ? "Engaged" : "Disengaged"
                  }
                  duration={state.settings?.slave.flipperDuration}
                  isActive={state.flipper === "ON"}
                  className="text-xs md:text-sm"
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
                  className="text-xs md:text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* System Monitor */}
          <Card className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-card">
            <CardHeader className="px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                System Monitor
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[250px] md:h-[300px] px-4">
                <div className="space-y-2 py-4">
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
      </div>
    );
  }
);

// Add display name for React DevTools
LiveView.displayName = "LiveView";

export default LiveView;
