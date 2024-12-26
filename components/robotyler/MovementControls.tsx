import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  RotateCw,
  Home,
  Gauge,
  SprayCanIcon,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface MovementControlsProps {
  wsConnected: boolean;
  sendCommand: (command: { type: string; payload?: any }) => void;
  handleRotate: (direction: "left" | "right") => void;
  position?: {
    x: number;
    y: number;
    timestamp?: number;
  };
}

// Update DirectionButton props to include diagonal directions
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
  handleRotate,
  position = { x: 0, y: 0 },
}) => {
  const [speed, setSpeed] = useState(50);
  const [acceleration, setAcceleration] = useState(50);
  const [activeDirection, setActiveDirection] = useState<string | null>(null);
  const [isSprayActive, setIsSprayActive] = useState(false);
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
    setInputValues({ x: position.x.toString(), y: position.y.toString() });
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
      type: "MOVE_TO_POSITION",
      payload: {
        x: targetPosition.x,
        y: targetPosition.y,
        speed: speed / 100,
        acceleration: acceleration / 100,
      },
    });
    setShowMoveButton(false);
  };

  // Handle movement start
  const startMovement = (direction: string) => {
    setActiveDirection(direction);
    sendCommand({
      type: "MANUAL_MOVE",
      payload: {
        direction,
        speed: speed / 100,
        acceleration: acceleration / 100,
        state: "START",
      },
    });
  };

  // Handle movement stop
  const stopMovement = () => {
    if (activeDirection) {
      sendCommand({
        type: "MANUAL_MOVE",
        payload: {
          direction: activeDirection,
          state: "STOP",
        },
      });
      setActiveDirection(null);
    }
  };

  // Toggle spray
  const toggleSpray = () => {
    const newState = !isSprayActive;
    setIsSprayActive(newState);
    sendCommand({
      type: "TOGGLE_SPRAY",
      payload: {
        state: newState ? "START" : "STOP",
      },
    });
  };

  // DirectionButton component
  const DirectionButton = ({
    direction,
    icon: Icon,
    className = "",
  }: DirectionButtonProps) => (
    <motion.button
      className={`relative p-4 rounded-lg bg-white dark:bg-gray-800 
        shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 
        border border-gray-100 dark:border-transparent
        ${
          activeDirection === direction
            ? "ring-2 ring-blue-500 dark:ring-blue-400"
            : ""
        }
        ${className}
        hover:bg-gray-50 dark:hover:bg-gray-750`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onMouseDown={() => startMovement(direction)}
      onMouseUp={stopMovement}
      onMouseLeave={stopMovement}
      onTouchStart={() => startMovement(direction)}
      onTouchEnd={stopMovement}
      disabled={!wsConnected}
    >
      <Icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
      <motion.div
        className="absolute inset-0 rounded-lg bg-blue-500/10 dark:bg-blue-400/10"
        animate={{
          opacity: activeDirection === direction ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
      />
    </motion.button>
  );

  // Clean up any active movements when component unmounts
  useEffect(() => {
    return () => {
      if (activeDirection) {
        sendCommand({
          type: "MANUAL_MOVE",
          payload: {
            direction: activeDirection,
            state: "STOP",
          },
        });
      }
      if (isSprayActive) {
        sendCommand({
          type: "TOGGLE_SPRAY",
          payload: {
            state: "STOP",
          },
        });
      }
    };
  }, [activeDirection, isSprayActive, sendCommand]);

  return (
    <div className="space-y-6">
      {/* Position Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-transparent">
        <div className="grid grid-cols-[1fr,1fr,auto] gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <ArrowRight className="w-4 h-4" />X Position
            </label>
            <div className="relative">
              <Input
                type="number"
                value={inputValues.x}
                onChange={(e) => handlePositionChange("x", e.target.value)}
                className="bg-gray-50 dark:bg-gray-700 pr-16"
                step="0.1"
                disabled={!wsConnected}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                inches
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <ArrowUp className="w-4 h-4" />Y Position
            </label>
            <div className="relative">
              <Input
                type="number"
                value={inputValues.y}
                onChange={(e) => handlePositionChange("y", e.target.value)}
                className="bg-gray-50 dark:bg-gray-700 pr-16"
                step="0.1"
                disabled={!wsConnected}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                inches
              </span>
            </div>
          </div>
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

      {/* Spray Toggle Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="lg"
          className={`px-4 h-10 bg-white dark:bg-white-200 dark:text-black
            ${
              isSprayActive
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                : "border-gray-200"
            }
            hover:bg-gray-50 dark:hover:bg-gray-750`}
          onClick={toggleSpray}
          disabled={!wsConnected}
        >
          <SprayCanIcon className="w-4 h-4 mr-2" />
          <span className="font-medium">Spray</span>
        </Button>
      </div>

      {/* Movement Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-transparent">
        <div className="relative flex items-center justify-center">
          <div className="grid grid-cols-3 gap-3">
            {/* Top row */}
            <div className="col-start-1 border-2 border-gray-100 dark:border-gray-700 rounded-lg">
              <DirectionButton direction="forward-left" icon={ArrowUpLeft} />
            </div>
            <div className="col-start-2 border-2 border-gray-100 dark:border-gray-700 rounded-lg    ">
              <DirectionButton direction="forward" icon={ArrowUp} />
            </div>
            <div className="col-start-3 border-2 border-gray-100 dark:border-gray-700 rounded-lg">
              <DirectionButton direction="forward-right" icon={ArrowUpRight} />
            </div>

            {/* Middle row */}
            <div className="col-start-1 row-start-2 border-2 border-gray-100 dark:border-gray-700 rounded-lg">
              <DirectionButton direction="left" icon={ArrowLeft} />
            </div>
            <div className="col-start-2 row-start-2">
              <Button
                variant="outline"
                size="icon"
                className="w-full h-full aspect-square bg-white dark:bg-gray-800 
                  border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
                onClick={() => sendCommand({ type: "HOME_SYSTEM" })}
                disabled={!wsConnected}
              >
                <Home className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </Button>
            </div>
            <div className="col-start-3 row-start-2 border-2 border-gray-100 dark:border-gray-700 rounded-lg">
              <DirectionButton direction="right" icon={ArrowRight} />
            </div>

            {/* Bottom row */}
            <div className="col-start-1 row-start-3 border-2 border-gray-100 dark:border-gray-700 rounded-lg">
              <DirectionButton direction="backward-left" icon={ArrowDownLeft} />
            </div>
            <div className="col-start-2 row-start-3 border-2 border-gray-100 dark:border-gray-700 rounded-lg">
              <DirectionButton direction="backward" icon={ArrowDown} />
            </div>
            <div className="col-start-3 row-start-3 border-2 border-gray-100 dark:border-gray-700 rounded-lg">
              <DirectionButton
                direction="backward-right"
                icon={ArrowDownRight}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Rotation Controls */}
      <div className="flex justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="p-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 
            hover:bg-gray-50 dark:hover:bg-gray-750"
          onClick={() => handleRotate("left")}
          disabled={!wsConnected}
        >
          <RotateCcw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="p-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 
            hover:bg-gray-50 dark:hover:bg-gray-750"
          onClick={() => handleRotate("right")}
          disabled={!wsConnected}
        >
          <RotateCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Button>
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
            onValueChange={(values) => setSpeed(values[0] ?? speed)}
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
              setAcceleration(values[0] ?? acceleration)
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
