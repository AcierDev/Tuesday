import React, { useEffect, useState, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { motion, useAnimation } from "framer-motion";
import {
  SprayCan,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Settings2,
  Save,
  X,
  MoveHorizontal,
  MoveVertical,
  Grid3X3,
  ArrowUpRight,
} from "lucide-react";
import { SystemState, SystemSettings } from "@/app/robotyler/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface TrayVisualizationProps {
  status: SystemState;
  settings: SystemSettings;
  className?: string;
  onSideClick?: (side: string) => void;
  onUpdateSettings?: (command: { type: string; payload: any }) => void;
  wsConnected?: boolean;
}

const TrayVisualization: React.FC<TrayVisualizationProps> = ({
  status,
  settings,
  className = "",
  onSideClick,
  onUpdateSettings,
  wsConnected = false,
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
  const [showSettings, setShowSettings] = useState(false);
  const [patternSettings, setPatternSettings] = useState({
    initialOffsets: {
      front: { x: 0, y: 0 },
      right: { x: 0, y: 0 },
      back: { x: 0, y: 0 },
      left: { x: 0, y: 0 },
    },
    travelDistance: {
      horizontal: { x: 0, y: 0 },
      vertical: { x: 0, y: 0 },
    },
    rows: { x: 0, y: 0 },
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Add visual feedback states
  const [activeCell, setActiveCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [hoveredSetting, setHoveredSetting] = useState<string | null>(null);

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

    const displayText =
      side === "FRONT" ? "BACK" : side === "BACK" ? "FRONT" : side;

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
            {displayText}
          </button>
        </motion.div>
      </div>
    );
  };

  // Update pattern settings when props change
  useEffect(() => {
    setPatternSettings(settings.pattern);
    setHasChanges(false);
  }, [settings.pattern]);

  const handleSettingChange = (
    category: keyof typeof patternSettings,
    field: string,
    value: number
  ) => {
    setPatternSettings((prev) => {
      const newSettings = { ...prev };
      const [mainField, subField] = field.split(".");

      if (subField) {
        newSettings[category][mainField][subField] = value;
      } else {
        newSettings[category][field] = value;
      }

      return newSettings;
    });
    setHasChanges(true);
  };

  const handleSaveSettings = () => {
    if (onUpdateSettings) {
      onUpdateSettings({
        type: "UPDATE_SETTINGS",
        payload: { pattern: patternSettings },
      });
      toast.success("Pattern settings saved successfully");
      setHasChanges(false);
    }
  };

  // Add interactive grid cell component
  const GridCell = ({
    row,
    col,
    isPassed,
  }: {
    row: number;
    col: number;
    isPassed: boolean;
  }) => {
    const isActive = activeCell?.row === row && activeCell?.col === col;
    const isHovered = hoveredSetting === `${row}-${col}`;

    return (
      <motion.div
        className={`border border-gray-200 dark:border-gray-600 rounded cursor-pointer 
          ${isActive ? "ring-2 ring-blue-500" : ""} 
          ${isHovered ? "bg-blue-100 dark:bg-blue-900/50" : ""}`}
        initial={{ opacity: 0.6 }}
        animate={{
          opacity: isPassed ? 1 : 0.6,
          backgroundColor: isPassed
            ? "rgb(219 234 254 / 0.8)"
            : "rgb(255 255 255 / 0.1)",
          scale: isActive || isHovered ? 1.05 : 1,
        }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setActiveCell({ row, col })}
        onHoverStart={() => setHoveredSetting(`${row}-${col}`)}
        onHoverEnd={() => setHoveredSetting(null)}
      />
    );
  };

  // Update the SettingInput component to handle arrow colors
  const SettingInput = ({
    label,
    value,
    onChange,
    icon,
    className = "",
    isXAxis = false, // New prop to determine arrow color
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    icon?: React.ReactNode;
    className?: string;
    isXAxis?: boolean;
  }) => (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Label className="text-sm font-medium flex items-center gap-1">
        {icon && (
          <span
            className={
              isXAxis
                ? "text-blue-600 dark:text-blue-400"
                : "text-rose-600 dark:text-rose-400"
            }
          >
            {icon}
          </span>
        )}
        {label}
      </Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-24 text-sm bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600"
      />
    </div>
  );

  // First, let's create a new component for the floating grid controls
  const FloatingGridControl = ({
    label,
    value,
    onChange,
    icon,
    isXAxis,
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    icon: React.ReactNode;
    isXAxis: boolean;
  }) => (
    <div className="absolute bg-gray-900/80 backdrop-blur-sm p-2 rounded-lg border border-gray-700 flex items-center gap-2">
      <SettingInput
        label={label}
        value={value}
        onChange={onChange}
        icon={icon}
        isXAxis={isXAxis}
        className="!mb-0"
      />
    </div>
  );

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl relative">
      {/* Header with settings toggle */}
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
          {showSettings
            ? "Pattern Settings"
            : "Pattern Progress & Visualization"}
          {!showSettings && getDirectionIcon()}
        </h3>
        <div className="flex items-center gap-2">
          {hasChanges && showSettings && (
            <Button
              size="sm"
              onClick={handleSaveSettings}
              disabled={!wsConnected}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          )}
          <Button
            variant={showSettings ? "destructive" : "outline"}
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="relative"
          >
            {showSettings ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Exit Settings
              </>
            ) : (
              <>
                <Settings2 className="w-4 h-4 mr-2" />
                Edit Pattern
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="relative flex flex-col items-center">
        {/* Tray visualization */}
        <div className="relative">
          <motion.div
            className="relative"
            animate={{ rotate: getRotation() }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            <div
              className={`border-4 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 rounded-lg relative transition-all duration-300 ${
                showSettings ? "ring-2 ring-blue-500" : ""
              }`}
              style={{
                width: TRAY_WIDTH,
                height: TRAY_HEIGHT,
              }}
            >
              {/* Floating grid controls */}
              {showSettings && (
                <>
                  {/* Columns control above BACK */}
                  <div className="absolute -top-24 left-1/2 -translate-x-1/2">
                    <div className="bg-gray-900/80 backdrop-blur-sm p-3 rounded-lg border border-gray-700">
                      <SettingInput
                        label="Columns"
                        value={patternSettings.rows.x}
                        onChange={(value) =>
                          handleSettingChange("rows", "x", value)
                        }
                        icon={<ArrowRight className="w-4 h-4" />}
                        isXAxis={true}
                      />
                    </div>
                  </div>

                  {/* Rows control next to LEFT */}
                  <div className="absolute top-1/2 -right-52 -translate-y-1/2">
                    <div className="bg-gray-900/80 backdrop-blur-sm p-3 rounded-lg border border-gray-700">
                      <SettingInput
                        label="Rows"
                        value={patternSettings.rows.y}
                        onChange={(value) =>
                          handleSettingChange("rows", "y", value)
                        }
                        icon={<ArrowUp className="w-4 h-4" />}
                        isXAxis={false}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Side indicators */}
              {renderSideIndicator(
                "FRONT",
                "bottom-0 left-1/2 -translate-x-1/2"
              )}
              {renderSideIndicator("BACK", "top-0 left-1/2 -translate-x-1/2")}
              {renderSideIndicator("LEFT", "top-1/2 right-0 -translate-y-1/2")}
              {renderSideIndicator("RIGHT", "top-1/2 left-0 -translate-y-1/2")}

              {/* Grid cells */}
              <div
                className="absolute grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${COLS}, ${BLOCK_SIZE}px)`,
                  gridTemplateRows: `repeat(${ROWS}, ${BLOCK_SIZE}px)`,
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: `${COLS * BLOCK_SIZE}px`,
                  height: `${ROWS * BLOCK_SIZE}px`,
                }}
              >
                {Array.from({ length: ROWS * COLS }).map((_, i) => {
                  const row = Math.floor(i / COLS);
                  const col = i % COLS;
                  const passedTime = passedBlocks.get(i);
                  const isPassed =
                    passedTime !== undefined && passedTime <= Date.now();
                  return (
                    <GridCell key={i} row={row} col={col} isPassed={isPassed} />
                  );
                })}
              </div>

              {renderPaintHead()}
            </div>
          </motion.div>
        </div>

        {/* Bottom settings panels */}
        {showSettings && (
          <div className="grid grid-cols-4 gap-6 mt-12 w-full">
            {/* Horizontal Travel */}
            <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
              <h4 className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2 mb-4">
                <MoveHorizontal className="w-4 h-4" />
                Horizontal Travel
              </h4>
              <div className="space-y-4">
                <SettingInput
                  label="X Distance"
                  value={patternSettings.travelDistance.horizontal.x}
                  onChange={(value) =>
                    handleSettingChange("travelDistance", "horizontal.x", value)
                  }
                  icon={<ArrowRight className="w-4 h-4" />}
                  isXAxis={true}
                />
                <SettingInput
                  label="Y Distance"
                  value={patternSettings.travelDistance.horizontal.y}
                  onChange={(value) =>
                    handleSettingChange("travelDistance", "horizontal.y", value)
                  }
                  icon={<ArrowUp className="w-4 h-4" />}
                  isXAxis={false}
                />
              </div>
            </div>

            {/* Initial Offsets - now spans 2 columns */}
            <div className="col-span-2 bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
              <h4 className="font-medium text-amber-400 flex items-center gap-2 mb-4">
                <ArrowUpRight className="w-4 h-4" />
                Initial Offsets
              </h4>
              <div className="grid grid-cols-2 gap-4 relative">
                {/* Horizontal divider */}
                <div className="absolute left-0 right-0 top-1/2 border-t border-gray-600/50" />
                {/* Vertical divider */}
                <div className="absolute top-0 bottom-0 left-1/2 border-l border-gray-600/50" />

                {Object.entries(patternSettings.initialOffsets).map(
                  ([side, offset]) => (
                    <div key={side} className="space-y-2 p-4">
                      <h5 className="text-sm font-medium capitalize">
                        {side === "front"
                          ? "back"
                          : side === "back"
                          ? "front"
                          : side}
                      </h5>
                      <div className="flex gap-2">
                        <SettingInput
                          label="X"
                          value={offset.x}
                          onChange={(value) =>
                            handleSettingChange(
                              "initialOffsets",
                              `${side}.x`,
                              value
                            )
                          }
                          icon={<ArrowRight className="w-4 h-4" />}
                          isXAxis={true}
                          className="flex-1"
                        />
                        <SettingInput
                          label="Y"
                          value={offset.y}
                          onChange={(value) =>
                            handleSettingChange(
                              "initialOffsets",
                              `${side}.y`,
                              value
                            )
                          }
                          icon={<ArrowUp className="w-4 h-4" />}
                          isXAxis={false}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Vertical Travel */}
            <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
              <h4 className="font-medium text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-4">
                <MoveVertical className="w-4 h-4" />
                Vertical Travel
              </h4>
              <div className="space-y-4">
                <SettingInput
                  label="X Distance"
                  value={patternSettings.travelDistance.vertical.x}
                  onChange={(value) =>
                    handleSettingChange("travelDistance", "vertical.x", value)
                  }
                  icon={<ArrowRight className="w-4 h-4" />}
                  isXAxis={true}
                />
                <SettingInput
                  label="Y Distance"
                  value={patternSettings.travelDistance.vertical.y}
                  onChange={(value) =>
                    handleSettingChange("travelDistance", "vertical.y", value)
                  }
                  icon={<ArrowUp className="w-4 h-4" />}
                  isXAxis={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress section - only show when not in settings mode */}
      {!showSettings && (
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
      )}
    </div>
  );
};

export default TrayVisualization;
