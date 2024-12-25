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

interface MovementControlsProps {
  wsConnected: boolean;
  sendCommand: (command: { type: string; payload?: any }) => void;
  handleRotate: (direction: "left" | "right") => void;
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
}) => {
  const [speed, setSpeed] = useState(50);
  const [acceleration, setAcceleration] = useState(50);
  const [activeDirection, setActiveDirection] = useState<string | null>(null);
  const [isSprayActive, setIsSprayActive] = useState(false);

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
      className={`relative p-6 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 
        shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 
        ${
          activeDirection === direction
            ? "ring-2 ring-blue-500 dark:ring-blue-400"
            : ""
        }
        ${className}
        hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-800`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onMouseDown={() => startMovement(direction)}
      onMouseUp={stopMovement}
      onMouseLeave={stopMovement}
      onTouchStart={() => startMovement(direction)}
      onTouchEnd={stopMovement}
      disabled={!wsConnected}
    >
      <Icon className="w-8 h-8 text-gray-700 dark:text-gray-300 transition-colors" />
      <motion.div
        className="absolute inset-0 rounded-xl bg-blue-500/20 dark:bg-blue-400/20"
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
    <div className="space-y-8">
      {/* Spray Toggle Button */}
      <div className="flex justify-end pr-12 pt-2">
        <Button
          variant="outline"
          size="lg"
          className={`px-6 h-12 bg-gradient-to-br 
            ${
              isSprayActive
                ? "from-cyan-100 to-cyan-200 dark:from-cyan-900/30 dark:to-cyan-900/20 ring-2 ring-cyan-500"
                : "from-gray-100 to-gray-200 dark:from-gray-800/50 dark:to-gray-900/50"
            }
            border-2 hover:from-cyan-100 hover:to-cyan-200 
            dark:hover:from-cyan-900/30 dark:hover:to-cyan-900/20 
            transition-all duration-200`}
          onClick={toggleSpray}
          disabled={!wsConnected}
        >
          <SprayCanIcon
            className={`w-5 h-5 mr-2 ${
              isSprayActive
                ? "text-cyan-600 dark:text-cyan-400"
                : "text-gray-600 dark:text-gray-400"
            } transition-colors`}
          />
          <span
            className={`font-medium ${
              isSprayActive
                ? "text-cyan-600 dark:text-cyan-400"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            Spray
          </span>
        </Button>
      </div>

      {/* Movement Controls */}
      <div className="relative flex items-center justify-center">
        <div className="grid grid-cols-3 gap-4">
          {/* Top row */}
          <div className="col-start-1">
            <DirectionButton direction="forward-left" icon={ArrowUpLeft} />
          </div>
          <div className="col-start-2">
            <DirectionButton direction="forward" icon={ArrowUp} />
          </div>
          <div className="col-start-3">
            <DirectionButton direction="forward-right" icon={ArrowUpRight} />
          </div>

          {/* Middle row */}
          <div className="col-start-1 row-start-2">
            <DirectionButton direction="left" icon={ArrowLeft} />
          </div>
          <div className="col-start-2 row-start-2">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-full min-h-[80px] bg-gradient-to-br from-emerald-50 to-emerald-100 
                dark:from-emerald-900/20 dark:to-emerald-900/10 border-2 hover:from-emerald-100 
                hover:to-emerald-200 dark:hover:from-emerald-900/30 dark:hover:to-emerald-900/20 
                transition-all duration-200"
              onClick={() => sendCommand({ type: "HOME_SYSTEM" })}
              disabled={!wsConnected}
            >
              <Home className="w-6 h-6 text-emerald-600 dark:text-emerald-400 transition-colors" />
            </Button>
          </div>
          <div className="col-start-3 row-start-2">
            <DirectionButton direction="right" icon={ArrowRight} />
          </div>

          {/* Bottom row */}
          <div className="col-start-1 row-start-3">
            <DirectionButton direction="backward-left" icon={ArrowDownLeft} />
          </div>
          <div className="col-start-2 row-start-3">
            <DirectionButton direction="backward" icon={ArrowDown} />
          </div>
          <div className="col-start-3 row-start-3">
            <DirectionButton direction="backward-right" icon={ArrowDownRight} />
          </div>
        </div>
      </div>

      {/* Rotation Controls */}
      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 
            dark:from-purple-900/20 dark:to-purple-900/10
            hover:from-purple-100 hover:to-purple-200 
            dark:hover:from-purple-900/30 dark:hover:to-purple-900/20
            transition-all duration-200"
          onClick={() => handleRotate("left")}
          disabled={!wsConnected}
        >
          <RotateCcw className="w-6 h-6 text-purple-600 dark:text-purple-400 transition-colors" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 
            dark:from-purple-900/20 dark:to-purple-900/10
            hover:from-purple-100 hover:to-purple-200 
            dark:hover:from-purple-900/30 dark:hover:to-purple-900/20
            transition-all duration-200"
          onClick={() => handleRotate("right")}
          disabled={!wsConnected}
        >
          <RotateCw className="w-6 h-6 text-purple-600 dark:text-purple-400 transition-colors" />
        </Button>
      </div>

      {/* Speed & Acceleration Controls */}
      <div
        className="space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 
        dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl p-6 shadow-lg"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <Gauge className="w-4 h-4 text-indigo-500" />
              Movement Speed
            </label>
            <span
              className="text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 
              text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-md"
            >
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
            className="relative flex items-center select-none touch-none w-full"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <Gauge className="w-4 h-4 text-indigo-500" />
              Acceleration
            </label>
            <span
              className="text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 
              text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-md"
            >
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
            className="relative flex items-center select-none touch-none w-full"
          />
        </div>
      </div>
    </div>
  );
};
