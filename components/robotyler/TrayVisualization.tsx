import React, { useEffect, useState, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { motion, useAnimation } from "framer-motion";
import {
  SprayCan,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { SystemState, SystemSettings } from "@/app/robotyler/page";

interface TrayVisualizationProps {
  status: SystemState;
  settings: SystemSettings;
  className?: string;
  onSideClick?: (side: string) => void;
  onUpdateSettings: (command: { type: string; payload?: any }) => void;
  wsConnected: boolean;
}

const TrayVisualization: React.FC<TrayVisualizationProps> = ({
  status,
  settings,
  className = "",
  onSideClick,
  onUpdateSettings,
  wsConnected,
}) => {
  // Constants for visualization
  const ROWS = 8;
  const COLS = 6;
  const BLOCK_SIZE = 32;
  const TRAY_PADDING = 16;
  const TRAY_WIDTH = COLS * BLOCK_SIZE + 2 * TRAY_PADDING;
  const TRAY_HEIGHT = ROWS * BLOCK_SIZE + 2 * TRAY_PADDING;
  const MIN_DURATION = 0.2; // Minimum duration in seconds

  const sprayHeadControls = useAnimation();
  const lastPositionRef = useRef({ row: 0, col: 0 });
  const [passedBlocks, setPassedBlocks] = useState(new Map<number, number>());
  const prevCommandRef = useRef(status.patternProgress.command);
  const [orientation, setOrientation] = useState<string>();

  // Get the current orientation based on status
  const isPainting =
    status.status === "EXECUTING_PATTERN" || status.status === "PAINTING_SIDE";
  const isPaused = status.status === "PAUSED";
  const currentProgress =
    status.patternProgress.total_commands > 0
      ? (status.patternProgress.command /
          status.patternProgress.total_commands) *
        100
      : 0;

  // Reset painted blocks when switching sides
  useEffect(() => {
    const newPattern = status.patternProgress.pattern || "FRONT";
    if (newPattern !== orientation) {
      // Reset blocks and update orientation atomically
      setPassedBlocks(new Map());
      setOrientation(newPattern);

      // Reset refs to ensure clean state
      prevCommandRef.current = -1;
      lastPositionRef.current = { row: 0, col: 0 };
    }
  }, [status.patternProgress.pattern]);

  // Reset painted blocks when homing
  useEffect(() => {
    if (status.status === "HOMING_X") {
      setPassedBlocks(new Map());
    }
  }, [status.status]);

  // Calculate current position based on command
  const getCurrentPosition = () => {
    const commandsPerRow = 4; // MOVE_X, SPRAY_ON, MOVE_X, SPRAY_OFF
    const currentRow = Math.floor(
      status.patternProgress.command / commandsPerRow
    );
    const currentCol = currentRow % 2 === 0 ? 0 : COLS - 1; // Alternate start position
    return { row: currentRow, col: currentCol };
  };

  // Extract duration from lastSerialMessage
  const getCommandDuration = () => {
    const durationMatch = status.lastSerialMessage.match(
      /duration_ms=(\d+(\.\d+)?)/
    );
    return durationMatch ? parseFloat(durationMatch[1]!) / 1000 : MIN_DURATION;
  };

  // Update painted blocks and animate spray head based on current progress
  useEffect(() => {
    if (
      isPainting &&
      !isPaused &&
      status.patternProgress.command !== prevCommandRef.current &&
      status.patternProgress.pattern === orientation
    ) {
      const newPassedBlocks = new Map<number, number>(passedBlocks);
      const { row, col } = getCurrentPosition();
      const duration = getCommandDuration();

      // Determine if it's a Y-axis movement
      const isYMovement = status.lastSerialMessage.includes("movement_axis=Y");

      // Determine painting direction
      const isLeftToRight = row % 2 === 0;
      const startCol = isLeftToRight ? 0 : COLS - 1;
      const endCol = isLeftToRight ? COLS - 1 : 0;

      // Update passed blocks
      const currentTime = Date.now();
      if (isLeftToRight) {
        for (let c = startCol; c <= endCol; c++) {
          const blockIndex = row * COLS + c;
          const delay = (c - startCol) * (duration / COLS);
          newPassedBlocks.set(blockIndex, currentTime + delay * 1000);
        }
      } else {
        for (let c = startCol; c >= endCol; c--) {
          const blockIndex = row * COLS + c;
          const delay = (startCol - c) * (duration / COLS);
          newPassedBlocks.set(blockIndex, currentTime + delay * 1000);
        }
      }

      setPassedBlocks(newPassedBlocks);

      // Animate spray head
      const x = TRAY_PADDING + col * BLOCK_SIZE * 1.12;
      const y = TRAY_PADDING + row * BLOCK_SIZE * 1.15;

      if (isYMovement) {
        // Animate Y movement
        sprayHeadControls.start({
          y,
          transition: { duration, ease: "linear" },
        });
      } else {
        // Animate X movement
        sprayHeadControls.start({
          x,
          transition: { duration, ease: "linear" },
        });
      }

      lastPositionRef.current = { row, col };
      prevCommandRef.current = status.patternProgress.command;
    }
  }, [
    status.patternProgress.command,
    isPainting,
    isPaused,
    status.lastSerialMessage,
    status.patternProgress.pattern,
    orientation,
  ]);

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
      case "LIP":
        return isHorizontal ? "-mb-16" : "-mb-12";
      case "BACK":
        return isHorizontal ? "-mt-16" : "-mt-12";
      case "RIGHT":
        return isHorizontal ? "-ml-16" : "-ml-20";
      case "LEFT":
        return isHorizontal
          ? "right-0 translate-x-[70px]"
          : "right-0 translate-x-[70px]";
      default:
        return "";
    }
  };

  const renderPaintHead = () => {
    if (!isPainting) return null;

    return (
      <motion.div className="absolute" animate={sprayHeadControls}>
        <SprayCan
          className={`w-6 h-6 ${
            isPaused
              ? "text-gray-400 dark:text-gray-600"
              : "text-blue-500 dark:text-blue-400"
          } ${isPainting && !isPaused ? "animate-pulse" : ""}`}
        />
      </motion.div>
    );
  };

  const getStatusText = () => {
    if (status.status === "IDLE") return "System Idle";
    if (status.status === "PAUSED") return "System Paused";
    if (!isPainting) return status.status.replace(/_/g, " ");

    const { row, col } = getCurrentPosition();
    return `Painting ${orientation} Side - Row ${row + 1}, Column ${
      col + 1
    } (${Math.round(currentProgress)}% Complete)`;
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
    <div className="p-6 bg-white dark:bg-gray-800 rounded-full">
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
            {renderSideIndicator("FRONT", "bottom-0 left-2/3 -translate-x-1/2")}
            {renderSideIndicator("LIP", "bottom-0 left-1/3 -translate-x-1/2")}
            {renderSideIndicator("BACK", "top-0 left-1/2 -translate-x-1/2")}
            {renderSideIndicator("LEFT", "top-1/2 right-0 -translate-y-1/2")}
            {renderSideIndicator("RIGHT", "top-1/2 left-0 -translate-y-1/2")}

            <div
              className="absolute grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${COLS}, ${BLOCK_SIZE}px)`,
                gridTemplateRows: `repeat(${ROWS}, ${BLOCK_SIZE}px)`,
                left: TRAY_PADDING + "px",
                top: TRAY_PADDING + "px",
              }}
            >
              {Array.from({ length: ROWS * COLS }).map((_, i) => {
                const passedTime = passedBlocks.get(i);
                const isPassed =
                  passedTime !== undefined && passedTime <= Date.now();
                return (
                  <motion.div
                    key={i}
                    className={`border border-gray-200 dark:border-gray-600 rounded transition-all duration-300`}
                    initial={{ opacity: 0.6 }}
                    animate={{
                      opacity: isPassed ? 1 : 0.6,
                      backgroundColor: isPassed
                        ? "rgb(219 234 254 / 0.8)" // bg-blue-100 with opacity
                        : isPassed
                        ? "rgb(147 197 253 / 0.4)" // bg-blue-300 with lower opacity
                        : "rgb(255 255 255 / 0.1)", // Very light background
                      scale: isPassed ? [1, 1.05, 1] : 1,
                    }}
                    transition={{
                      duration: 0.3,
                      scale: {
                        repeat: Infinity,
                        duration: 1,
                      },
                    }}
                  />
                );
              })}
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
            <p>Current Row: {getCurrentPosition().row + 1}</p>
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
