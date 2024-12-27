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
  CircleDot,
  Zap,
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
  servoAngle?: number;
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
  limitSwitches,
  servoAngle = 90,
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
  const [targetServoAngle, setTargetServoAngle] = useState(
    servoAngle.toString()
  );

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
          return limitSwitches.y.max && limitSwitches.x.min;
        case "forward-right":
          return limitSwitches.y.max && limitSwitches.x.max;
        case "backward-left":
          return limitSwitches.y.min && limitSwitches.x.min;
        case "backward-right":
          return limitSwitches.y.min && limitSwitches.x.max;
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

  // Add handler for servo angle changes
  const handleServoAngleChange = (value: string) => {
    setTargetServoAngle(value);
    const numValue =
      value === "" ? 90 : Math.min(Math.max(parseFloat(value), 0), 180);
    if (!isNaN(numValue)) {
      sendCommand({
        type: "SET_SERVO_ANGLE",
        payload: {
          angle: numValue,
        },
      });
    }
  };

  const adjustServoAngle = (adjustment: number) => {
    const currentAngle = parseFloat(targetServoAngle) || 90;
    const newAngle = Math.min(Math.max(currentAngle + adjustment, 0), 180);
    setTargetServoAngle(newAngle.toString());
    sendCommand({
      type: "SET_SERVO_ANGLE",
      payload: {
        angle: newAngle,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Position Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-transparent">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto] gap-4 items-end">
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

      {/* Movement and Servo Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr,300px] gap-4 lg:gap-8">
        {/* Servo Controls - First in desktop */}
        <div className="w-full order-last lg:order-first">
          {/* Servo Control Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-transparent">
            <div className="space-y-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <CircleDot className="w-4 h-4" />
                Spray Angle Control
              </h3>

              {/* Servo angle visualization */}
              <div className="relative h-40 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-2 border-gray-200 dark:border-gray-700 relative">
                  {/* Angle markers */}
                  <div className="absolute inset-0">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <path
                        d="M50,50 L85,15 A50,50 0 0,0 50,0 L50,50"
                        fill="rgb(239 68 68 / 0.2)"
                        transform="rotate(135, 50, 50)"
                      />
                    </svg>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {[0, 45, 90, 135, 180].map((angle) => (
                      <div
                        key={angle}
                        className="absolute w-full h-full"
                        style={{ transform: `rotate(${180 + angle}deg)` }}
                      >
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2 w-0.5 bg-gray-300 dark:bg-gray-600" />
                        <div
                          className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 dark:text-gray-400"
                          style={{ transform: "rotate(180deg)" }}
                        >
                          {angle}°
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Center point dot */}
                  <div className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 -translate-x-1/2 -translate-y-1/2" />
                  {/* Servo indicator line */}
                  <div
                    className="w-1.5 h-16 bg-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 rounded-full"
                    style={{
                      transform: `translateX(-50%) rotate(${
                        180 + parseFloat(targetServoAngle)
                      }deg)`,
                      transformOrigin: "top",
                      boxShadow: "0 0 10px rgba(59, 130, 246, 0.5)",
                    }}
                  />
                </div>
              </div>

              {/* Angle input controls */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => adjustServoAngle(-5)}
                    disabled={!wsConnected}
                    className="w-16 bg-white dark:bg-gray-800 border dark:border-gray-700"
                  >
                    -5°
                  </Button>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      value={targetServoAngle}
                      onChange={(e) => handleServoAngleChange(e.target.value)}
                      className="bg-gray-50 dark:bg-gray-700 pr-8 text-center"
                      min="0"
                      max="180"
                      step="0.1"
                      disabled={!wsConnected}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                      °
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => adjustServoAngle(5)}
                    disabled={!wsConnected}
                    className="w-16 bg-white dark:bg-gray-800 border dark:border-gray-700"
                  >
                    +5°
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full bg-white dark:bg-gray-800 border dark:border-gray-700"
                  onClick={() => handleServoAngleChange("90")}
                  disabled={!wsConnected}
                >
                  Reset to 90°
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Movement Controls - Second in desktop */}
        <div className="w-full order-first lg:order-2 lg:max-w-[400px] lg:justify-self-center">
          {/* Movement Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-transparent">
            <div className="space-y-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
                <ArrowUp className="w-4 h-4" />
                Movement Controls
              </h3>

              <div className="relative flex items-center justify-center">
                <div className="grid grid-cols-3 gap-3">
                  {/* Top row */}
                  <div className="col-start-1 border-2 border-gray-100 dark:border-gray-700 rounded-lg">
                    <DirectionButton
                      direction="forward-left"
                      icon={ArrowUpLeft}
                    />
                  </div>
                  <div className="col-start-2 border-2 border-gray-100 dark:border-gray-700 rounded-lg    ">
                    <DirectionButton direction="forward" icon={ArrowUp} />
                  </div>
                  <div className="col-start-3 border-2 border-gray-100 dark:border-gray-700 rounded-lg">
                    <DirectionButton
                      direction="forward-right"
                      icon={ArrowUpRight}
                    />
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
                        border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750
                        p-5"
                      onClick={() => sendCommand({ type: "HOME_SYSTEM" })}
                      disabled={!wsConnected}
                    >
                      <Home className="w-7 h-7 text-gray-600 dark:text-gray-300" />
                    </Button>
                  </div>
                  <div className="col-start-3 row-start-2 border-2 border-gray-100 dark:border-gray-700 rounded-lg">
                    <DirectionButton direction="right" icon={ArrowRight} />
                  </div>

                  {/* Bottom row */}
                  <div className="col-start-1 row-start-3 border-2 border-gray-100 dark:border-gray-700 rounded-lg">
                    <DirectionButton
                      direction="backward-left"
                      icon={ArrowDownLeft}
                    />
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
          </div>
        </div>

        {/* Button Stack - Last in desktop */}
        <div className="flex flex-col items-center gap-4 mx-auto w-full max-w-[12rem] lg:justify-center lg:h-full order-2 lg:order-last">
          <Button
            variant="outline"
            size="lg"
            className={`w-48 h-12 bg-white dark:bg-gray-800
              ${
                isSprayActive
                  ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 ring-2 ring-cyan-500/20"
                  : "border-gray-200"
              }
              hover:bg-gray-50 dark:hover:bg-gray-750`}
            onClick={toggleSpray}
            disabled={!wsConnected}
          >
            <SprayCanIcon className="w-5 h-5 mr-2" />
            <span className="font-medium">
              {isSprayActive ? "Stop" : "Start"} Spray
            </span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-48 h-12 bg-white dark:bg-gray-800 border-gray-200 
              hover:bg-gray-50 dark:hover:bg-gray-750"
            onClick={() => sendCommand({ type: "TOGGLE_PRESSURE_POT" })}
            disabled={!wsConnected}
          >
            <Zap className="w-5 h-5 mr-2" />
            <span className="font-medium">Pressurize</span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-48 h-12 bg-white dark:bg-gray-800 border-gray-200 
              hover:bg-gray-50 dark:hover:bg-gray-750"
            onClick={() => handleRotate("left")}
            disabled={!wsConnected}
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            <span className="font-medium">Rotate Left 90°</span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-48 h-12 bg-white dark:bg-gray-800 border-gray-200 
              hover:bg-gray-50 dark:hover:bg-gray-750"
            onClick={() => handleRotate("right")}
            disabled={!wsConnected}
          >
            <RotateCw className="w-5 h-5 mr-2" />
            <span className="font-medium">Rotate Right 90°</span>
          </Button>
        </div>
      </div>

      {/* Speed & Acceleration Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-2 border-gray-100 dark:border-gray-700 space-y-4 w-full">
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
