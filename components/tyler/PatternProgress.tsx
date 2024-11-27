import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Box, PaintBucket } from "lucide-react";
import { SystemStatus } from "@/app/tyler/page";

const PatternProgress = ({ status }: { status: SystemStatus }) => {
  // Check if we should show the progress
  const isExecuting =
    status.state === "EXECUTING_PATTERN" || status.state === "PAINTING_SIDE";

  // Calculate percentage complete
  const percentComplete =
    isExecuting && status.patternProgress.totalCommands > 0
      ? (status.patternProgress.currentCommand /
          status.patternProgress.totalCommands) *
        100
      : 0;

  // Don't render anything if we're not executing a pattern
  if (!isExecuting) {
    return null;
  }

  return (
    <Card className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center">
          <PaintBucket className="mr-2" size={20} />
          Pattern Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center">
              <Box className="mr-2" size={18} />
              Active Side:
            </span>
            <span className="font-semibold text-blue-500">
              {status.patternProgress.sidePattern ||
                `Side ${status.patternProgress.activeSide}`}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress:</span>
              <span>{Math.round(percentComplete)}%</span>
            </div>
            <Progress
              value={percentComplete}
              className="h-2 bg-gray-200 dark:bg-gray-700"
            />
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Step {status.patternProgress.currentCommand} of{" "}
              {status.patternProgress.totalCommands}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatternProgress;
