import React from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  Clock,
  BarChart2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";
import { DailyStats, CycleStats } from "@/typings/types";
import { Progress } from "@/components/ui/progress";
import { CycleStatsCard } from "./CycleStatsCard";
import { ActivityChart } from "./ActivityChart";

interface StatsOverviewProps {
  dailyStats?: DailyStats;
  currentCycleStats?: CycleStats;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  trend?: number;
  pulseColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  pulseColor = "blue",
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.2 }}
    className="relative bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg overflow-hidden"
  >
    {/* Animated gradient background */}
    <div
      className="absolute inset-0 bg-gradient-to-br opacity-5"
      style={{
        backgroundImage: `linear-gradient(to bottom right, ${pulseColor}, transparent)`,
      }}
    />

    {/* Pulse effect */}
    <motion.div
      className="absolute inset-0"
      animate={{
        background: [
          `radial-gradient(circle at center, ${pulseColor}10 0%, transparent 0%)`,
          `radial-gradient(circle at center, ${pulseColor}00 100%, transparent 100%)`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />

    <div className="relative flex items-center justify-between">
      <div className="flex items-center gap-4">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className={`p-2 bg-${pulseColor}-500/10 rounded-lg`}
        >
          <Icon className={`h-6 w-6 text-${pulseColor}-500`} />
        </motion.div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <motion.h3
            className="text-2xl font-bold"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {value}
          </motion.h3>
        </div>
      </div>
      {trend !== undefined && (
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`text-sm font-medium ${
            trend > 0
              ? "text-green-500"
              : trend < 0
              ? "text-red-500"
              : "text-gray-500"
          }`}
        >
          {trend > 0 ? "+" : ""}
          {trend}%
        </motion.div>
      )}
    </div>
    {description && (
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-2 text-sm text-gray-500 dark:text-gray-400"
      >
        {description}
      </motion.p>
    )}
  </motion.div>
);

const StatsOverview: React.FC<StatsOverviewProps> = ({
  dailyStats,
  currentCycleStats,
}) => {
  if (!dailyStats) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left Column - Quick Stats & Current Cycle */}
      <div className="xl:col-span-2 space-y-6 flex flex-col">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Cycles"
            value={dailyStats.totalCycles}
            icon={Activity}
            description="Total processing cycles today"
            pulseColor="blue"
          />
          <StatCard
            title="Success Rate"
            value={`${dailyStats.successRate.toFixed(1)}%`}
            icon={CheckCircle2}
            description="Successful processing rate"
            pulseColor="green"
          />
          <StatCard
            title="Ejection Rate"
            value={`${dailyStats.ejectionRate.toFixed(1)}%`}
            icon={AlertTriangle}
            description="Board ejection rate"
            pulseColor="yellow"
          />
          <StatCard
            title="Total Defects"
            value={dailyStats.totalDefectsFound}
            icon={XCircle}
            description="Total defects detected"
            pulseColor="red"
          />
        </div>

        {/* Activity Chart - Now fills remaining space */}
        <div className="flex-1">
          <ActivityChart data={dailyStats.cyclesByHour} />
        </div>
      </div>

      {/* Right Column - Current Cycle & Processing Times */}
      <div className="space-y-6">
        {/* Current Cycle Stats */}
        {currentCycleStats && <CycleStatsCard stats={currentCycleStats} />}

        {/* Processing Times */}
        <Card className="bg-white dark:bg-gray-800 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-blue-500" />
              Processing Times
            </CardTitle>
            <CardDescription>Average processing durations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries({
                "Cycle Time": dailyStats.cycleTime,
                "Analysis Time": dailyStats.analysisTime,
                "Capture Time": dailyStats.captureTime,
              }).map(([label, stats]) => {
                // Ensure values are in milliseconds and convert to seconds for display
                const min = stats.min / 1000;
                const max = stats.max / 1000;
                const avg = stats.avg / 1000;

                // Calculate progress relative to the full range
                const range = max - min;
                const progress = range === 0 ? 0 : ((avg - min) / range) * 100;

                // Ensure progress is between 0 and 100
                const clampedProgress = Math.max(0, Math.min(100, progress));

                return (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-1.5"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{label}</span>
                      <span className="text-gray-500">
                        {avg.toFixed(2)}s avg
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-12">
                        {min.toFixed(2)}s
                      </span>
                      <div className="relative flex-1">
                        <Progress value={clampedProgress} className="h-2" />
                        <motion.div
                          className="absolute top-0 h-full w-1 bg-blue-500"
                          style={{
                            left: `${clampedProgress}%`,
                          }}
                          animate={{
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">
                        {max.toFixed(2)}s
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Additional Stats Card */}
        <Card className="bg-white dark:bg-gray-800 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart2 className="h-5 w-5 text-blue-500" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Avg Cycle Time</p>
                  <p className="text-xl font-semibold">
                    {(dailyStats.cycleTime.avg / 1000).toFixed(2)}s
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Peak Performance</p>
                  <p className="text-xl font-semibold">
                    {Math.max(...dailyStats.cyclesByHour)} cycles/hr
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StatsOverview;
