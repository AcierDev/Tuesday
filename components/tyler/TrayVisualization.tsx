import React from "react";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  SprayCan,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { SystemStatus } from "@/app/tyler/page";

interface TrayVisualizationProps {
  status: SystemStatus;
  className?: string;
  onSideClick?: (side: string) => void;
}

const TrayVisualization: React.FC<TrayVisualizationProps> = ({
  status,
  className = "",
  onSideClick,
}) => {
  // Constants for visualization
  const ROWS = status.patternProgress.total_rows;
  const COLS = ROWS == 9 ? 6 : 9;
  const BLOCK_SIZE = 32;
  const TRAY_PADDING = 16;
  const TRAY_WIDTH = COLS * BLOCK_SIZE + 2 * TRAY_PADDING;
  const TRAY_HEIGHT = ROWS * BLOCK_SIZE + 2 * TRAY_PADDING;
  const MOVEMENT_DURATION = 0.5;

  // Get the current orientation based on status
  const orientation = status.patternProgress.pattern || "FRONT";
  const isPainting =
    status.state === "EXECUTING_PATTERN" || status.state === "PAINTING_SIDE";
  const isPaused = status.state === "PAUSED";
  const currentProgress =
    status.patternProgress.total_commands > 0
      ? (status.patternProgress.command /
          status.patternProgress.total_commands) *
        100
      : 0;

  const getRotation = () => {
    switch (orientation) {
      case "RIGHT":
        return 90;
      case "BACK":
        return 180;
      case "LEFT":
        return 270;
      default:
        return 0;
    }
  };

  // Get spacing based on orientation
  const getSideIndicatorPosition = (side: string) => {
    const isHorizontal = orientation === "LEFT" || orientation === "RIGHT";

    switch (side) {
      case "FRONT":
        return isHorizontal ? "-mb-16" : "-mb-12";
      case "BACK":
        return isHorizontal ? "-mt-16" : "-mt-12";
      case "LEFT":
        return isHorizontal ? "-ml-16" : "-ml-16";
      case "RIGHT":
        return isHorizontal
          ? "right-0 translate-x-[70px]"
          : "right-0 translate-x-[76px]";
      default:
        return "";
    }
  };

  const renderPaintHead = () => {
    if (!isPainting) return null;

    const x = TRAY_PADDING;
    const y = TRAY_PADDING + status.patternProgress.row * BLOCK_SIZE;

    return (
      <motion.div
        className="absolute"
        animate={{ x, y }}
        transition={{ duration: MOVEMENT_DURATION, ease: "linear" }}
      >
        <SprayCan
          className={`w-6 h-6 ${isPaused ? "text-gray-400" : "text-blue-500"} ${
            isPainting ? "animate-pulse" : ""
          }`}
        />
      </motion.div>
    );
  };

  const getStatusText = () => {
    if (status.state === "IDLE") return "System Idle";
    if (status.state === "PAUSED") return "System Paused";
    if (!isPainting) return status.state.replace(/_/g, " ");

    return `Painting ${orientation} Side - Row ${
      status.patternProgress.row + 1
    }/${ROWS} (${Math.round(currentProgress)}% Complete)`;
  };

  const getDirectionIcon = () => {
    switch (orientation) {
      case "FRONT":
        return <ArrowRight className="w-5 h-5" />;
      case "BACK":
        return <ArrowLeft className="w-5 h-5" />;
      case "RIGHT":
        return <ArrowUp className="w-5 h-5" />;
      case "LEFT":
        return <ArrowDown className="w-5 h-5" />;
      default:
        return null;
    }
  };

  // Helper function to get block styling
  const getBlockStyle = (row: number) => {
    const isCompleted = status.patternProgress.completed_rows.includes(row);
    const isCurrentRow = row === status.patternProgress.row;

    if (isCompleted) {
      return "bg-blue-100 dark:bg-blue-900 opacity-100";
    } else if (isCurrentRow && isPainting && !isPaused) {
      return "bg-blue-50 dark:bg-blue-800/50 animate-pulse";
    }
    return "bg-white dark:bg-gray-800 opacity-60";
  };

  const renderSideIndicator = (side: string, className: string) => {
    const isActive = orientation === side;
    const currentRotation = getRotation();
    let counterRotation = -currentRotation;

    const dynamicPosition = getSideIndicatorPosition(side);
    const combinedClassName = `absolute ${className} ${dynamicPosition}`;

    return (
      <div className={combinedClassName}>
        <motion.div
          animate={{ rotate: counterRotation }}
          transition={{ type: "spring", stiffness: 100 }}
        >
          <button
            onClick={() => onSideClick?.(side)}
            className={`px-2 py-1 rounded-md font-medium inline-block transition-all duration-200 ${
              isActive
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-800"
            }`}
          >
            {side}
          </button>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
          Pattern Progress & Visualization
          {getDirectionIcon()}
        </h3>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
          <span className="text-sm font-medium">Current Side:</span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {orientation}
          </span>
        </div>
      </div>

      <div
        className="flex justify-center items-center relative"
        style={{
          minHeight: TRAY_HEIGHT + 96,
          margin: "0 auto",
        }}
      >
        <motion.div
          className="relative"
          animate={{ rotate: getRotation() }}
          transition={{ type: "spring", stiffness: 100 }}
        >
          <div
            className="border-4 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 rounded-lg relative"
            style={{
              width: TRAY_WIDTH + TRAY_PADDING * 2 - 3,
              height: TRAY_HEIGHT + TRAY_PADDING * 2 + 8,
            }}
          >
            {/* Side Indicators with dynamic spacing */}
            {renderSideIndicator("FRONT", "bottom-0 left-1/2 -translate-x-1/2")}
            {renderSideIndicator("BACK", "top-0 left-1/2 -translate-x-1/2")}
            {renderSideIndicator("LEFT", "top-1/2 left-0 -translate-y-1/2")}
            {renderSideIndicator("RIGHT", "top-1/2 right-0 -translate-y-1/2")}

            <div
              className="absolute grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${COLS}, ${BLOCK_SIZE}px)`,
                gridTemplateRows: `repeat(${ROWS}, ${BLOCK_SIZE}px)`,
                left: TRAY_PADDING + "px",
                top: TRAY_PADDING + "px",
              }}
            >
              {Array.from({ length: ROWS }).map((_, row) =>
                Array.from({ length: COLS }).map((_, col) => (
                  <motion.div
                    key={`${row}-${col}`}
                    className={`border border-gray-200 dark:border-gray-600 rounded transition-colors duration-300 ${getBlockStyle(
                      row
                    )}`}
                  />
                ))
              )}
            </div>
            {renderPaintHead()}
          </div>
        </motion.div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{getStatusText()}</span>
            <span>{Math.round(currentProgress)}%</span>
          </div>
          <Progress
            value={currentProgress}
            className={`h-2 ${isPaused ? "animate-pulse" : ""}`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
            <p>Current Row: {status.patternProgress.row + 1}</p>
            <p>
              Completed Rows: {status.patternProgress.completed_rows.length}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
            <p>Current Command: {status.patternProgress.command}</p>
            <p>Total Commands: {status.patternProgress.total_commands}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrayVisualization;
