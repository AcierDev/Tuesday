import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogEntry } from "@/components/router/LogEntry";
import ImageAnalysisCard from "@/components/router/ImageAnalysisCard";
import { EmptyLogs } from "@/utils/functions";
import { MessageSquare } from "lucide-react";
import { ImageMetadata } from "@/typings/types";
import { StatusCard } from "@/components/shared/StatusCard";
import { Circle, Power, RotateCw } from "lucide-react";

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

const LiveView: React.FC<LiveViewProps> = ({
  currentImage,
  state,
  logs,
  historicalImages = [],
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Image Analysis */}
      <div>
        <ImageAnalysisCard
          imageUrl={currentImage.url}
          imageMetadata={currentImage.metadata}
          analysis={state.currentAnalysis}
          isCapturing={state.isCapturing}
          isAnalyzing={state.isAnalyzing}
          ejectionDecision={state.ejectionDecision}
          historicalImages={historicalImages}
        />
      </div>

      {/* Right Column - System Status & Monitor */}
      <div className="space-y-6">
        {/* System Status */}
        <Card className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-card">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Real-time sensor and device status
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* System Monitor */}
        <Card className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              System Monitor
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px] px-4">
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
};

export default LiveView;
