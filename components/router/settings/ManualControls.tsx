import React, { useState, useEffect } from "react";
import {
  Hand,
  Info,
  Gauge,
  ArrowUpCircle,
  RotateCcw,
  Aperture,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RouterSettings, SlaveState } from "@/typings/types";

interface ManualControlsProps {
  config: RouterSettings;
  slaveState: SlaveState;
  sendManualCommand: (command: string) => void;
}

const renderTooltip = (content: string) => (
  <TooltipProvider>
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Info className="h-4 w-4 ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors" />
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const ManualControls: React.FC<ManualControlsProps> = ({
  config,
  slaveState,
  sendManualCommand,
}) => {
  const [servoPosition, setServoPosition] = useState(90);
  const [statusMessages, setStatusMessages] = useState<string[]>([]);

  // Update servo position based on current settings when they change
  useEffect(() => {
    if (config.slave?.servoIdleAngle) {
      setServoPosition(config.slave.servoIdleAngle || 90);
    }
  }, [config.slave?.servoIdleAngle]);

  const addStatusMessage = (message: string) => {
    setStatusMessages((prev) => {
      const newMessages = [message, ...prev.slice(0, 4)];
      return newMessages;
    });
  };

  const handleServoSliderChange = (value: number[]) => {
    if (value[0] !== undefined) {
      setServoPosition(value[0]);
    }
  };

  const handleServoPreset = (preset: string) => {
    let position = 90;
    switch (preset) {
      case "idle":
        position = config.slave?.servoIdleAngle || 80;
        break;
      case "analysis":
        position = config.slave?.servoAnalysisAngle || 30;
        break;
      case "pass":
        position = config.slave?.servoPassAngle || 10;
        break;
      case "eject":
        position = config.slave?.servoEjectAngle || 180;
        break;
    }
    setServoPosition(position);
    sendManualCommand(`MANUAL_SERVO_POSITION ${position}`);
    addStatusMessage(`Set servo to ${preset} position (${position}°)`);
  };

  const handleServoApply = () => {
    sendManualCommand(`MANUAL_SERVO_POSITION ${servoPosition}`);
    addStatusMessage(`Set servo to ${servoPosition}°`);
  };

  const handleCylinderToggle = (component: string, state: boolean) => {
    const command = `MANUAL_${component}_${state ? "ON" : "OFF"}`;
    sendManualCommand(command);
    addStatusMessage(
      `${
        component.charAt(0).toUpperCase() + component.slice(1).toLowerCase()
      } cylinder ${state ? "activated" : "deactivated"}`
    );
  };

  const handleFlipperToggle = (state: boolean) => {
    const command = `MANUAL_FLIPPER_${state ? "ON" : "OFF"}`;
    sendManualCommand(command);
    addStatusMessage(`Flipper ${state ? "activated" : "deactivated"}`);
  };

  const getStatusIndicator = (status: "ON" | "OFF") => {
    return status === "ON" ? (
      <Badge
        variant="outline"
        className="bg-green-500/20 text-green-500 border-green-500/50"
      >
        Active
      </Badge>
    ) : (
      <Badge
        variant="outline"
        className="bg-gray-500/20 text-gray-500 border-gray-500/50"
      >
        Inactive
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900/5 dark:bg-gray-800 backdrop-blur-sm border border-gray-200/20 shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Hand className="h-5 w-5 text-blue-500" />
            Manual Control Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cylinders Control */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Push Cylinder */}
            <div className="p-4 bg-gray-100/50 dark:bg-gray-700/30 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ArrowUpCircle className="h-5 w-5 text-blue-500" />
                  <h3 className="font-medium">Push Cylinder</h3>
                  {renderTooltip(
                    "Controls the main push cylinder that moves boards forward"
                  )}
                </div>
                {getStatusIndicator(slaveState?.push_cylinder || "OFF")}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleCylinderToggle("PUSH", true)}
                  disabled={slaveState?.push_cylinder === "ON"}
                >
                  Activate
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleCylinderToggle("PUSH", false)}
                  disabled={slaveState?.push_cylinder === "OFF"}
                >
                  Deactivate
                </Button>
              </div>
            </div>

            {/* Ejection Cylinder */}
            <div className="p-4 bg-gray-100/50 dark:bg-gray-700/30 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <RotateCcw className="h-5 w-5 text-orange-500" />
                  <h3 className="font-medium">Ejection Cylinder</h3>
                  {renderTooltip(
                    "Controls the ejection cylinder that removes defective boards"
                  )}
                </div>
                {getStatusIndicator(slaveState?.ejection_cylinder || "OFF")}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  onClick={() => handleCylinderToggle("EJECT", true)}
                  disabled={slaveState?.ejection_cylinder === "ON"}
                >
                  Activate
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleCylinderToggle("EJECT", false)}
                  disabled={slaveState?.ejection_cylinder === "OFF"}
                >
                  Deactivate
                </Button>
              </div>
            </div>

            {/* Flipper */}
            <div className="p-4 bg-gray-100/50 dark:bg-gray-700/30 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Gauge className="h-5 w-5 text-purple-500" />
                  <h3 className="font-medium">Flipper</h3>
                  {renderTooltip(
                    "Controls the flipper mechanism for board handling"
                  )}
                </div>
                {getStatusIndicator(slaveState?.flipper || "OFF")}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={() => handleFlipperToggle(true)}
                  disabled={slaveState?.flipper === "ON"}
                >
                  Activate
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleFlipperToggle(false)}
                  disabled={slaveState?.flipper === "OFF"}
                >
                  Deactivate
                </Button>
              </div>
            </div>

            {/* Servo Control */}
            <div className="p-4 bg-gray-100/50 dark:bg-gray-700/30 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Aperture className="h-5 w-5 text-green-500" />
                  <h3 className="font-medium">Servo Position</h3>
                  {renderTooltip(
                    "Controls the servo that positions the camera"
                  )}
                </div>
                <div className="text-sm font-mono">{servoPosition}°</div>
              </div>
              <Slider
                value={[servoPosition]}
                min={0}
                max={180}
                step={1}
                onValueChange={handleServoSliderChange}
                className="my-4"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleServoPreset("idle")}
                  className="flex-1 min-w-[60px]"
                >
                  Idle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleServoPreset("analysis")}
                  className="flex-1 min-w-[60px]"
                >
                  Analysis
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleServoPreset("pass")}
                  className="flex-1 min-w-[60px]"
                >
                  Pass
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleServoPreset("eject")}
                  className="flex-1 min-w-[60px]"
                >
                  Eject
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 min-w-[60px] bg-green-600 hover:bg-green-700"
                  onClick={handleServoApply}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Recent Actions</h3>
            <div className="bg-gray-100/50 dark:bg-gray-700/30 rounded-lg p-3 h-[100px] overflow-y-auto">
              {statusMessages.length > 0 ? (
                <ul className="space-y-1">
                  {statusMessages.map((msg, i) => (
                    <li
                      key={i}
                      className="text-sm text-gray-600 dark:text-gray-300"
                    >
                      <span className="text-xs opacity-60">
                        {new Date().toLocaleTimeString()}
                      </span>{" "}
                      {msg}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                  No recent actions
                </p>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="p-3 bg-yellow-500/20 dark:bg-yellow-500/10 border border-yellow-500/50 rounded-lg mt-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              <strong>Warning:</strong> Manual controls override automated
              operation. Components can only be manually activated when the
              system is in IDLE state.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualControls;
