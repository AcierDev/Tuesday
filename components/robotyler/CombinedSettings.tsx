import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Settings,
  Save,
  Sliders,
  Grid,
  ArrowRight,
  ArrowUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatternSettings } from "./PatternSettings";
import { SystemState, SystemSettings } from "@/app/robotyler/page";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PatternConfig } from "@/typings/types";

interface CombinedControlsProps {
  status: SystemState;
  settings: SystemSettings;
  pendingSpeedChanges: Record<string, number>;
  handleSpeedChange: (
    side: "left" | "right" | "front" | "back" | "lip",
    value: number[]
  ) => void;
  handleRotate: (direction: "left" | "right") => void;
  handleSaveChanges: () => void;
  wsConnected: boolean;
  onMaintenanceSettingChange?: (
    setting: "primeTime" | "cleanTime" | "backWashTime" | "pressurePotDelay",
    value: number
  ) => void;
  pendingMaintenanceSettings?: {
    primeTime?: number;
    cleanTime?: number;
    backWashTime?: number;
    pressurePotDelay?: number;
    positions?: {
      prime?: { x: number; y: number; angle: number };
      clean?: { x: number; y: number; angle: number };
    };
  };
  onPendingMaintenanceChange?: (
    setting:
      | "primeTime"
      | "cleanTime"
      | "backWashTime"
      | "pressurePotDelay"
      | "positions",
    value:
      | number
      | {
          prime?: { x: number; y: number; angle: number };
          clean?: { x: number; y: number; angle: number };
        }
  ) => void;
  onSaveMaintenanceChanges: () => void;
  hasUnsavedMaintenanceChanges: boolean;
  sendCommand: (command: { type: string; payload?: any }) => void;
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
  configs?: PatternConfig[];
}

const CombinedControls: React.FC<CombinedControlsProps> = ({
  status,
  settings,
  pendingSpeedChanges,
  handleSpeedChange,
  handleRotate,
  handleSaveChanges,
  wsConnected,
  onMaintenanceSettingChange,
  pendingMaintenanceSettings = {},
  onPendingMaintenanceChange,
  onSaveMaintenanceChanges,
  hasUnsavedMaintenanceChanges,
  sendCommand,
  limitSwitches,
  configs = [],
}) => {
  const [activeTab, setActiveTab] = React.useState("speeds");
  const [contentHeight, setContentHeight] = React.useState("auto");
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (contentRef.current) {
      setContentHeight(`${contentRef.current.offsetHeight}px`);
    }
  }, [activeTab]);

  const tabs = [
    {
      value: "speeds",
      label: "Speed Controls",
      icon: Sliders,
    },
    {
      value: "maintenance",
      label: "Maintenance",
      icon: Settings,
    },
    {
      value: "pattern",
      label: "Pattern Settings",
      icon: Grid,
    },
  ];

  const handlePositionChange = (
    type: "prime" | "clean",
    field: "x" | "y" | "angle",
    value: number
  ) => {
    onPendingMaintenanceChange?.("positions", {
      ...settings.maintenance.positions,
      ...pendingMaintenanceSettings.positions,
      [type]: {
        ...settings.maintenance.positions?.[type],
        ...pendingMaintenanceSettings.positions?.[type],
        [field]: value,
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && hasUnsavedMaintenanceChanges && wsConnected) {
      onSaveMaintenanceChanges();
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            System Controls
          </CardTitle>
          <div className="flex gap-2">
            {Object.keys(pendingSpeedChanges).length > 0 && (
              <Button
                size="sm"
                onClick={handleSaveChanges}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                <Save className="h-4 w-4 mr-1" />
                Save Speed Changes
              </Button>
            )}
            {hasUnsavedMaintenanceChanges && (
              <Button
                size="sm"
                onClick={onSaveMaintenanceChanges}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                <Save className="h-4 w-4 mr-1" />
                Save Maintenance Changes
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {activeTab === tab.value && (
                <motion.div
                  layoutId="activeTabControls"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                  initial={false}
                />
              )}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div
          style={{ height: contentHeight }}
          className="relative transition-height duration-300 ease-in-out overflow-hidden"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              ref={contentRef}
              className="absolute w-full"
              onAnimationComplete={() => {
                if (contentRef.current) {
                  setContentHeight(`${contentRef.current.offsetHeight}px`);
                }
              }}
            >
              {activeTab === "speeds" ? (
                <div className="space-y-4">
                  {Object.entries(settings.speeds).map(([side, speed]) => (
                    <div
                      key={side}
                      className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <span className="w-20 font-medium text-gray-700 dark:text-gray-300">
                          {side === "lip"
                            ? "Lip"
                            : side.charAt(0).toUpperCase() + side.slice(1)}
                          :
                        </span>
                        <Slider
                          value={[pendingSpeedChanges[side] ?? speed]}
                          onValueChange={(value) =>
                            handleSpeedChange(
                              side as keyof typeof settings.speeds,
                              value
                            )
                          }
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              Object.keys(pendingSpeedChanges).length > 0 &&
                              wsConnected
                            ) {
                              handleSaveChanges();
                            }
                          }}
                          max={100}
                          step={1}
                          className="flex-1"
                          disabled={!wsConnected}
                        />
                        <span className="w-16 text-right font-semibold bg-white dark:bg-gray-800 px-3 py-1 rounded-md">
                          {pendingSpeedChanges[side] ?? speed}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeTab === "pattern" ? (
                <PatternSettings
                  settings={settings}
                  onUpdate={sendCommand}
                  wsConnected={wsConnected}
                  configs={configs}
                />
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="w-24 font-medium text-gray-700 dark:text-gray-300">
                        Prime Time:
                      </span>
                      <Slider
                        value={[
                          pendingMaintenanceSettings.primeTime !== undefined
                            ? pendingMaintenanceSettings.primeTime
                            : settings.maintenance.primeTime ?? 5,
                        ]}
                        onValueChange={(value) => {
                          const newValue = value[0] || 5;
                          onPendingMaintenanceChange?.("primeTime", newValue);
                          onMaintenanceSettingChange?.("primeTime", newValue);
                        }}
                        onKeyDown={handleKeyDown}
                        max={30}
                        min={1}
                        step={1}
                        className="flex-1"
                        disabled={!wsConnected}
                      />
                      <span className="w-20 text-right font-semibold bg-white dark:bg-gray-800 px-3 py-1 rounded-md">
                        {pendingMaintenanceSettings.primeTime !== undefined
                          ? pendingMaintenanceSettings.primeTime
                          : settings.maintenance.primeTime ?? 5}
                        s
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="w-24 font-medium text-gray-700 dark:text-gray-300">
                        Clean Time:
                      </span>
                      <Slider
                        value={[
                          pendingMaintenanceSettings.cleanTime !== undefined
                            ? pendingMaintenanceSettings.cleanTime
                            : settings.maintenance.cleanTime ?? 10,
                        ]}
                        onValueChange={(value) => {
                          const newValue = value[0] || 10;
                          onPendingMaintenanceChange?.("cleanTime", newValue);
                          onMaintenanceSettingChange?.("cleanTime", newValue);
                        }}
                        onKeyDown={handleKeyDown}
                        max={30}
                        min={1}
                        step={1}
                        className="flex-1"
                        disabled={!wsConnected}
                      />
                      <span className="w-20 text-right font-semibold bg-white dark:bg-gray-800 px-3 py-1 rounded-md">
                        {pendingMaintenanceSettings.cleanTime !== undefined
                          ? pendingMaintenanceSettings.cleanTime
                          : settings.maintenance.cleanTime ?? 10}
                        s
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="w-24 font-medium text-gray-700 dark:text-gray-300">
                        Back Wash:
                      </span>
                      <Slider
                        value={[
                          pendingMaintenanceSettings.backWashTime !== undefined
                            ? pendingMaintenanceSettings.backWashTime
                            : settings.maintenance.backWashTime ?? 15,
                        ]}
                        onValueChange={(value) => {
                          const newValue = value[0] || 15;
                          onPendingMaintenanceChange?.(
                            "backWashTime",
                            newValue
                          );
                          onMaintenanceSettingChange?.(
                            "backWashTime",
                            newValue
                          );
                        }}
                        onKeyDown={handleKeyDown}
                        max={30}
                        min={1}
                        step={1}
                        className="flex-1"
                        disabled={!wsConnected}
                      />
                      <span className="w-20 text-right font-semibold bg-white dark:bg-gray-800 px-3 py-1 rounded-md">
                        {pendingMaintenanceSettings.backWashTime !== undefined
                          ? pendingMaintenanceSettings.backWashTime
                          : settings.maintenance.backWashTime ?? 15}
                        s
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="w-24 font-medium text-gray-700 dark:text-gray-300">
                        Pressure Delay:
                      </span>
                      <Slider
                        value={[
                          pendingMaintenanceSettings.pressurePotDelay !==
                          undefined
                            ? pendingMaintenanceSettings.pressurePotDelay / 1000
                            : settings.maintenance.pressurePotDelay / 1000 ?? 5,
                        ]}
                        onValueChange={(value) => {
                          const newValue = value[0] || 5;
                          onPendingMaintenanceChange?.(
                            "pressurePotDelay",
                            newValue * 1000
                          );
                          onMaintenanceSettingChange?.(
                            "pressurePotDelay",
                            newValue * 1000
                          );
                        }}
                        onKeyDown={handleKeyDown}
                        max={30}
                        min={1}
                        step={1}
                        className="flex-1"
                        disabled={!wsConnected}
                      />
                      <span className="w-20 text-right font-semibold bg-white dark:bg-gray-800 px-3 py-1 rounded-md">
                        {pendingMaintenanceSettings.pressurePotDelay !==
                        undefined
                          ? pendingMaintenanceSettings.pressurePotDelay / 1000
                          : settings.maintenance.pressurePotDelay / 1000 ?? 5}
                        s
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <h3 className="font-medium mb-4">Prime Position</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="prime-pos-x"
                          className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1"
                        >
                          X Position <ArrowRight className="h-4 w-4" />
                        </Label>
                        <Input
                          id="prime-pos-x"
                          type="number"
                          value={
                            pendingMaintenanceSettings.positions?.prime?.x ??
                            settings.maintenance.positions?.prime?.x ??
                            0
                          }
                          onChange={(e) => {
                            handlePositionChange(
                              "prime",
                              "x",
                              parseFloat(e.target.value)
                            );
                          }}
                          onKeyDown={handleKeyDown}
                          className="dark:bg-gray-700"
                          disabled={!wsConnected}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="prime-pos-y"
                          className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1"
                        >
                          Y Position <ArrowUp className="h-4 w-4" />
                        </Label>
                        <Input
                          id="prime-pos-y"
                          type="number"
                          value={
                            pendingMaintenanceSettings.positions?.prime?.y ??
                            settings.maintenance.positions?.prime?.y ??
                            0
                          }
                          onChange={(e) => {
                            handlePositionChange(
                              "prime",
                              "y",
                              parseFloat(e.target.value)
                            );
                          }}
                          onKeyDown={handleKeyDown}
                          className="dark:bg-gray-700"
                          disabled={!wsConnected}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="prime-pos-angle"
                          className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1"
                        >
                          Gun Angle
                        </Label>
                        <Input
                          id="prime-pos-angle"
                          type="number"
                          value={
                            pendingMaintenanceSettings.positions?.prime
                              ?.angle ??
                            settings.maintenance.positions?.prime?.angle ??
                            90
                          }
                          onChange={(e) => {
                            handlePositionChange(
                              "prime",
                              "angle",
                              parseFloat(e.target.value)
                            );
                          }}
                          onKeyDown={handleKeyDown}
                          className="dark:bg-gray-700"
                          disabled={!wsConnected}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <h3 className="font-medium mb-4">Clean Position</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="clean-pos-x"
                          className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1"
                        >
                          X Position <ArrowRight className="h-4 w-4" />
                        </Label>
                        <Input
                          id="clean-pos-x"
                          type="number"
                          value={
                            pendingMaintenanceSettings.positions?.clean?.x ??
                            settings.maintenance.positions?.clean?.x ??
                            0
                          }
                          onChange={(e) => {
                            handlePositionChange(
                              "clean",
                              "x",
                              parseFloat(e.target.value)
                            );
                          }}
                          onKeyDown={handleKeyDown}
                          className="dark:bg-gray-700"
                          disabled={!wsConnected}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="clean-pos-y"
                          className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1"
                        >
                          Y Position <ArrowUp className="h-4 w-4" />
                        </Label>
                        <Input
                          id="clean-pos-y"
                          type="number"
                          value={
                            pendingMaintenanceSettings.positions?.clean?.y ??
                            settings.maintenance.positions?.clean?.y ??
                            0
                          }
                          onChange={(e) => {
                            handlePositionChange(
                              "clean",
                              "y",
                              parseFloat(e.target.value)
                            );
                          }}
                          onKeyDown={handleKeyDown}
                          className="dark:bg-gray-700"
                          disabled={!wsConnected}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="clean-pos-angle"
                          className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1"
                        >
                          Gun Angle
                        </Label>
                        <Input
                          id="clean-pos-angle"
                          type="number"
                          value={
                            pendingMaintenanceSettings.positions?.clean
                              ?.angle ??
                            settings.maintenance.positions?.clean?.angle ??
                            90
                          }
                          onChange={(e) => {
                            handlePositionChange(
                              "clean",
                              "angle",
                              parseFloat(e.target.value)
                            );
                          }}
                          onKeyDown={handleKeyDown}
                          className="dark:bg-gray-700"
                          disabled={!wsConnected}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};

export default CombinedControls;
