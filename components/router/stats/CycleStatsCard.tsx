import React from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Timer, AlertCircle, Maximize2 } from "lucide-react";
import { CycleStats } from "@/typings/types";
import { Badge } from "@/components/ui/badge";

interface CycleStatsCardProps {
  stats: CycleStats;
}

export const CycleStatsCard: React.FC<CycleStatsCardProps> = ({ stats }) => {
  if (!stats) return null;

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-blue-500" />
          Current Cycle Stats
          <Badge variant={stats.ejectionDecision ? "destructive" : "default"}>
            {stats.ejectionDecision ? "Ejected" : "Passed"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Cycle ID: {stats.cycleId} • Duration:{" "}
          {(stats.duration / 1000).toFixed(2)}s
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Analysis Time</span>
              <span className="font-medium">
                {stats.analysisTime
                  ? (stats.analysisTime / 1000).toFixed(2)
                  : "N/A"}
                s
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Capture Time</span>
              <span className="font-medium">
                {stats.captureTime
                  ? (stats.captureTime / 1000).toFixed(2)
                  : "N/A"}
                s
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Defects Found</span>
              <span className="font-medium">{stats.defectsFound || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Area</span>
              <span className="font-medium">
                {stats.totalDefectArea?.toFixed(2) || 0}
              </span>
            </div>
          </div>
        </div>

        {stats.ejectionReasons && stats.ejectionReasons.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Ejection Reasons
            </h4>
            <ul className="space-y-1">
              {stats.ejectionReasons.map((reason, index) => (
                <li
                  key={index}
                  className="text-sm text-gray-500 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
