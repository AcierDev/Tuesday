import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Home,
  Gauge,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  GripVertical,
  Magnet,
  ArrowRightFromLine,
  ArrowLeftFromLine,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface MovementControlsProps {
  wsConnected: boolean;
  sendCommand: (command: { type: string; data?: any }) => void;
  position?: {
    x: number;
    y: number;
    timestamp?: number;
  };
  limitSwitches?: {
    x: {
      min: boolean;
      max: boolean;
    };
    y: {
      min: boolean;
      max: boolean;
    };
  };
  isHomed?: boolean;
  isSuctionActive?: boolean;
  isExtended?: boolean;
  gridRows: number;
  gridColumns: number;
  onGridRowsChange: (rows: number) => void;
  onGridColumnsChange: (columns: number) => void;
}

interface DirectionButtonProps {
  direction:
    | "forward"
    | "backward"
    | "left"
    | "right"
    | "forward-left"
    | "forward-right"
    | "backward-left"
    | "backward-right";
  icon: React.ElementType;
  className?: string;
}

export const MovementControls: React.FC<MovementControlsProps> = ({
  wsConnected,
  sendCommand,
  position = { x: 0, y: 0 },
  limitSwitches,
  isHomed = false,
  isSuctionActive = false,
  isExtended = false,
  gridRows,
  gridColumns,
  onGridRowsChange,
  onGridColumnsChange,
}) => {
  const [speed, setSpeed] = useState(50);
  const [acceleration, setAcceleration] = useState(50);
  const [activeDirection, setActiveDirection] = useState<string | null>(null);
  const [targetPosition, setTargetPosition] = useState({
    x: position.x,
    y: position.y,
  });
  const [showMoveButton, setShowMoveButton] = useState(false);
  const [inputValues, setInputValues] = useState({
    x: position.x.toString(),
    y: position.y.toString(),
  });

  // Update target position when actual position changes
  useEffect(() => {
    setTargetPosition({ x: position.x, y: position.y });
    setInputValues({
      x: position.x.toString(),
      y: position.y.toString(),
    });
    setShowMoveButton(false);
  }, [position.x, position.y]);

  const handlePositionChange = (axis: "x" | "y", value: string) => {
    setInputValues((prev) => ({ ...prev, [axis]: value }));

    const numValue = value === "" ? 0 : parseFloat(value);
    if (!isNaN(numValue)) {
      setTargetPosition((prev) => {
        const newPosition = { ...prev, [axis]: numValue };
        setShowMoveButton(
          newPosition.x !== position.x || newPosition.y !== position.y
        );
        return newPosition;
      });
    }
  };

  const handleMoveToPosition = () => {
    sendCommand({
      type: "command",
      data: {
        type: "goto",
        params: {
          x: targetPosition.x,
          y: targetPosition.y,
        },
      },
    });
    setShowMoveButton(false);
  };

  // Handle movement start
  const startMovement = (direction: string) => {
    setActiveDirection(direction);
    sendCommand({
      type: "command",
      data: {
        type: "manual_move",
        params: {
          direction,
          speed: speed / 100,
          acceleration: acceleration / 100,
          state: "START",
        },
      },
    });
  };

  // Handle movement stop
  const stopMovement = () => {
    if (activeDirection) {
      sendCommand({
        type: "command",
        data: {
          type: "manual_move",
          params: {
            direction: activeDirection,
            state: "STOP",
          },
        },
      });
      setActiveDirection(null);
    }
  };

  const toggleSuction = () => {
    sendCommand({
      type: "command",
      data: {
        type: "suction",
        params: {
          enabled: !isSuctionActive,
        },
      },
    });
  };

  const handleExtendRetract = (action: "EXTEND" | "RETRACT") => {
    sendCommand({
      type: "command",
      data: {
        type: action.toLowerCase(),
      },
    });
  };

  // Update speed and acceleration controls
  const handleSpeedChange = (value: number) => {
    setSpeed(value);
    sendCommand({
      type: "command",
      data: {
        type: "setSpeed",
        params: {
          speed: value / 100,
        },
      },
    });
  };

  const handleAccelerationChange = (value: number) => {
    setAcceleration(value);
    sendCommand({
      type: "command",
      data: {
        type: "setAccel",
        params: {
          accel: value / 100,
        },
      },
    });
  };

  // DirectionButton component
  const DirectionButton = ({
    direction,
    icon: Icon,
    className = "",
  }: DirectionButtonProps) => {
    // Helper function to check if movement in a direction is disabled
    const isDirectionDisabled = () => {
      if (!limitSwitches) return false;

      switch (direction) {
        case "forward":
          return limitSwitches.y.max;
        case "backward":
          return limitSwitches.y.min;
        case "left":
          return limitSwitches.x.min;
        case "right":
          return limitSwitches.x.max;
        case "forward-left":
          return limitSwitches.y.max || limitSwitches.x.min;
        case "forward-right":
          return limitSwitches.y.max || limitSwitches.x.max;
        case "backward-left":
          return limitSwitches.y.min || limitSwitches.x.min;
        case "backward-right":
          return limitSwitches.y.min || limitSwitches.x.max;
        default:
          return false;
      }
    };

    return (
      <button
        className={`relative p-5 rounded-lg bg-white dark:bg-gray-800 
          shadow-sm hover:shadow-md transition-all duration-200 
          border border-gray-100 dark:border-transparent
          ${
            activeDirection === direction
              ? "ring-2 ring-blue-500 dark:ring-blue-400"
              : ""
          }
          ${className}
          hover:bg-gray-50 dark:hover:bg-gray-750
          ${isDirectionDisabled() ? "opacity-50 cursor-not-allowed" : ""}
          disabled:opacity-50`}
        onMouseDown={() => !isDirectionDisabled() && startMovement(direction)}
        onMouseUp={stopMovement}
        onMouseLeave={stopMovement}
        onTouchStart={() => !isDirectionDisabled() && startMovement(direction)}
        onTouchEnd={stopMovement}
        disabled={!wsConnected || isDirectionDisabled()}
      >
        <Icon className="w-7 h-7 text-gray-700 dark:text-gray-300" />
        <div
          className={`absolute inset-0 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 transition-opacity duration-200
            ${activeDirection === direction ? "opacity-100" : "opacity-0"}`}
        />
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ArrowUp className="w-5 h-5 text-blue-500" />
          Movement Controls
        </h3>
      </div>

      {/* Position Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-transparent">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto] gap-4 items-end">
          {["x", "y"].map((axis) => (
            <div key={axis} className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-300">
                {axis.toUpperCase()} Position
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={inputValues[axis as keyof typeof inputValues]}
                  onChange={(e) =>
                    handlePositionChange(axis as "x" | "y", e.target.value)
                  }
                  className="bg-gray-50 dark:bg-gray-700 pr-16"
                  step="0.1"
                  disabled={!wsConnected}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                  mm
                </span>
              </div>
            </div>
          ))}
          {showMoveButton && (
            <Button
              onClick={handleMoveToPosition}
              disabled={!wsConnected}
              className="bg-blue-500 hover:bg-blue-600 text-white h-10"
            >
              Move
            </Button>
          )}
        </div>
      </div>

      {/* Movement Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr,auto] gap-4">
        {/* Grid Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-transparent">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Rows
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={gridRows}
                    onChange={(e) =>
                      onGridRowsChange(parseInt(e.target.value) || 1)
                    }
                    className="bg-gray-50 dark:bg-gray-700"
                    disabled={!wsConnected}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Columns
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={gridColumns}
                    onChange={(e) =>
                      onGridColumnsChange(parseInt(e.target.value) || 1)
                    }
                    className="bg-gray-50 dark:bg-gray-700"
                    disabled={!wsConnected}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center p-4 mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
                  width: `${gridColumns * 20}px`,
                }}
              >
                {Array.from({ length: gridRows * gridColumns }).map((_, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-sm bg-gray-200 dark:bg-gray-700"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* XY Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-transparent">
          <div className="space-y-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
              <ArrowUp className="w-4 h-4" />
              Movement Controls
            </h3>

            <div className="grid grid-cols-1 gap-6">
              <div className="relative flex items-center justify-center">
                <div className="grid grid-cols-3 gap-3">
                  {/* Top row */}
                  <DirectionButton
                    direction="forward-left"
                    icon={ArrowUpLeft}
                    className="border-2 border-gray-100 dark:border-gray-700"
                  />
                  <DirectionButton
                    direction="forward"
                    icon={ArrowUp}
                    className="border-2 border-gray-100 dark:border-gray-700"
                  />
                  <DirectionButton
                    direction="forward-right"
                    icon={ArrowUpRight}
                    className="border-2 border-gray-100 dark:border-gray-700"
                  />

                  {/* Middle row */}
                  <DirectionButton
                    direction="left"
                    icon={ArrowLeft}
                    className="border-2 border-gray-100 dark:border-gray-700"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-full h-full aspect-square bg-white dark:bg-gray-800 
                      border-2 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750
                      p-5"
                    onClick={() =>
                      sendCommand({
                        type: "command",
                        data: {
                          type: "home",
                        },
                      })
                    }
                    disabled={!wsConnected}
                  >
                    <Home className="w-7 h-7 text-gray-600 dark:text-gray-300" />
                  </Button>
                  <DirectionButton
                    direction="right"
                    icon={ArrowRight}
                    className="border-2 border-gray-100 dark:border-gray-700"
                  />

                  {/* Bottom row */}
                  <DirectionButton
                    direction="backward-left"
                    icon={ArrowDownLeft}
                    className="border-2 border-gray-100 dark:border-gray-700"
                  />
                  <DirectionButton
                    direction="backward"
                    icon={ArrowDown}
                    className="border-2 border-gray-100 dark:border-gray-700"
                  />
                  <DirectionButton
                    direction="backward-right"
                    icon={ArrowDownRight}
                    className="border-2 border-gray-100 dark:border-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 mx-auto w-full max-w-[12rem]">
          <Button
            variant="outline"
            size="lg"
            className={`w-48 h-12 bg-white dark:bg-gray-800 
              ${
                isSuctionActive
                  ? "border-purple-500 text-purple-600 dark:text-purple-400 ring-2 ring-purple-500/20"
                  : "border-gray-200 dark:border-gray-700"
              }
              hover:bg-gray-50 dark:hover:bg-gray-750`}
            onClick={toggleSuction}
            disabled={!wsConnected}
          >
            <Magnet
              className={`w-5 h-5 mr-2 ${
                isSuctionActive
                  ? "text-purple-500 dark:text-purple-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            />
            <span className="font-medium">
              {isSuctionActive ? "Disable" : "Enable"} Suction
            </span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className={`w-48 h-12 bg-white dark:bg-gray-800 
              ${
                isExtended
                  ? "border-orange-500 text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/20"
                  : "border-gray-200 dark:border-gray-700"
              }
              hover:bg-gray-50 dark:hover:bg-gray-750`}
            onClick={() =>
              handleExtendRetract(isExtended ? "RETRACT" : "EXTEND")
            }
            disabled={!wsConnected}
          >
            {isExtended ? (
              <ArrowLeftFromLine className="w-5 h-5 mr-2 text-orange-500 dark:text-orange-400" />
            ) : (
              <ArrowRightFromLine className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
            )}
            <span className="font-medium">
              {isExtended ? "Retract" : "Extend"} Actuator
            </span>
          </Button>
        </div>
      </div>

      {/* Speed & Acceleration Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-2 border-gray-100 dark:border-gray-700 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Movement Speed
            </label>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {speed}%
            </span>
          </div>
          <Slider
            value={[speed]}
            onValueChange={(values) => handleSpeedChange(values[0] ?? speed)}
            min={1}
            max={100}
            step={1}
            disabled={!wsConnected}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Acceleration
            </label>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {acceleration}%
            </span>
          </div>
          <Slider
            value={[acceleration]}
            onValueChange={(values) =>
              handleAccelerationChange(values[0] ?? acceleration)
            }
            min={1}
            max={100}
            step={1}
            disabled={!wsConnected}
          />
        </div>
      </div>
    </div>
  );
};
