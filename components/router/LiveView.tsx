import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogEntry } from "@/components/router/LogEntry";
import ImageAnalysisCard from "@/components/router/ImageAnalysisCard";
import { StatusCard } from "@/components/router/StatusCard";
import { EmptyLogs } from "@/utils/functions";
import { Circle, Power } from "lucide-react";

interface ImageMetadata {
  timestamp: string;
  // Add other metadata properties as needed
}

interface RouterState {
  sensor1: "ON" | "OFF";
  push_cylinder: "ON" | "OFF";
  riser_cylinder: "ON" | "OFF";
  ejection_cylinder: "ON" | "OFF";
  router_state: string;
  settings: {
    slave: {
      pushTime: number;
      riserTime: number;
      ejectionTime: number;
    };
  };
  currentImageUrl: string | null;
  currentImageMetadata: ImageMetadata | null;
  currentAnalysis: any | null;
  isCapturing: boolean;
  isAnalyzing: boolean;
  ejectionDecision: boolean | null;
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
}

const LiveView: React.FC<LiveViewProps> = ({ currentImage, state, logs }) => {
  return (
    <div className="grid gap-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left column - Image Analysis */}
        <div className="h-full">
          <ImageAnalysisCard
            imageUrl={currentImage.url}
            imageMetadata={currentImage.metadata}
            analysis={state.currentAnalysis || undefined}
            isCapturing={state.isCapturing}
            isAnalyzing={state.isAnalyzing}
            ejectionDecision={state.ejectionDecision}
          />
        </div>

        {/* Right column - Status Cards */}
        <div className="h-full flex flex-col gap-6">
          {/* System Status Card */}
          <Card className="flex-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
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
                  description={state.sensor1 === "ON" ? "Active" : "Inactive"}
                />
                <StatusCard
                  title="Push Cylinder"
                  status={state.push_cylinder === "ON"}
                  icon={Power}
                  description={
                    state.push_cylinder === "ON" ? "Engaged" : "Disengaged"
                  }
                  duration={state.settings.slave.pushTime}
                  isActive={state.push_cylinder === "ON"}
                />
                <StatusCard
                  title="Riser Cylinder"
                  status={state.riser_cylinder === "ON"}
                  icon={Power}
                  description={
                    state.riser_cylinder === "ON" ? "Engaged" : "Disengaged"
                  }
                  duration={state.settings.slave.riserTime}
                  isActive={state.riser_cylinder === "ON"}
                />
                <StatusCard
                  title="Ejection Cylinder"
                  status={state.ejection_cylinder === "ON"}
                  icon={Power}
                  description={
                    state.ejection_cylinder === "ON" ? "Engaged" : "Disengaged"
                  }
                  duration={state.settings.slave.ejectionTime}
                  isActive={state.ejection_cylinder === "ON"}
                />
              </div>
            </CardContent>
          </Card>

          {/* System Monitor Card */}
          <Card className="flex-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                System Monitor
              </CardTitle>
              <CardDescription>Real-time system logs</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[250px]">
                <div className="space-y-2 p-4">
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
    </div>
  );
};

export default LiveView;
