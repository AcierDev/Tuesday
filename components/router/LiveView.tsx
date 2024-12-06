import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogEntry } from "@/components/router/LogEntry";
import ImageAnalysisCard from "@/components/router/ImageAnalysisCard";
import { EmptyLogs } from "@/utils/functions";
import { MessageSquare } from "lucide-react";
import { ImageMetadata } from "@/typings/types";

interface RouterState {
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
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Column - Image Analysis (2/5 width) */}
      <div className="lg:col-span-2">
        <ImageAnalysisCard
          imageUrl={currentImage.url}
          imageMetadata={currentImage.metadata}
          analysis={state.currentAnalysis}
          isCapturing={state.isCapturing}
          isAnalyzing={state.isAnalyzing}
          ejectionDecision={state.ejectionDecision}
        />
      </div>

      {/* Right Column - System Monitor (3/5 width) */}
      <div className="lg:col-span-3">
        <Card className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              System Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px] px-4">
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
