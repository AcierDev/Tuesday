import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Info,
  Clock,
  Gauge,
  ArrowUpCircle,
  Settings2,
  Shield,
  Target,
  PauseCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import {
  RouterSettings,
  GlobalSettings as GlobalSettingsType,
} from "@/typings/types";

// Extended GlobalSettings type with mobile-specific properties
interface ExtendedGlobalSettings extends GlobalSettingsType {
  recordAllImages?: boolean;
  enableStragglerDetection?: boolean;
  stragglerThreshold?: number;
}

export type UpdateConfigFunction = (
  key: string,
  value: number | boolean | object
) => void;

export interface GlobalSettingsProps {
  config: RouterSettings;
  updateConfig: (path: string, value: any) => void;
  validationErrors: {
    [key: string]: string;
  };
}

const GlobalSettings = ({
  config,
  updateConfig,
  validationErrors,
}: GlobalSettingsProps) => {
  const [isMobile, setIsMobile] = useState(false);

  // Check if on mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const renderTooltip = (content: string) => {
    // Mobile devices: use a simpler tooltip or no tooltip
    if (isMobile) {
      return <span className="text-sm text-gray-400 ml-1">(?)</span>;
    }

    // Desktop tooltip implementation (unchanged)
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 ml-1 text-gray-400 hover:text-gray-300 transition-colors" />
          </TooltipTrigger>
          <TooltipContent className="bg-gray-800 text-gray-100 border-gray-700 p-2">
            <p className="text-sm">{content}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderTimeControl = (
    id: string,
    label: string,
    tooltip: string,
    value: number,
    icon: React.ReactNode,
    onChange: (value: number) => void,
    error?: string,
    index: number = 0
  ) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`space-y-2 ${isMobile ? "mb-6" : ""}`}
    >
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          {icon}
          <Label
            htmlFor={id}
            className={`font-medium ${isMobile ? "text-sm" : ""}`}
          >
            {label}
          </Label>
        </div>
        {renderTooltip(tooltip)}
      </div>
      <div
        className={`flex items-center ${isMobile ? "flex-col gap-3" : "gap-4"}`}
      >
        <div className={`relative ${isMobile ? "w-full" : "flex-1"}`}>
          <Slider
            id={id}
            min={0.1}
            max={5}
            step={0.1}
            value={[value / 1000]}
            onValueChange={(value) => onChange(value[0]! * 1000)}
            className="flex-1 [&>.relative>div:last-child]:dark:bg-gray-700"
          />
        </div>
        <div
          className={`flex items-center ${
            isMobile ? "w-full justify-between" : ""
          }`}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.2 }}
          >
            <Input
              type="number"
              min={0.1}
              max={5}
              step={0.1}
              value={(value / 1000).toFixed(1)}
              onChange={(e) => onChange(parseFloat(e.target.value) * 1000)}
              className={`${
                isMobile ? "w-24" : "w-20"
              } text-right dark:bg-gray-700`}
            />
          </motion.div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.3 }}
            className="text-sm text-gray-400 w-8 ml-2"
          >
            sec
          </motion.span>
        </div>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-red-500 text-sm mt-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderNumberInput = (
    id: string,
    label: string,
    tooltip: string,
    value: number,
    icon: React.ReactNode,
    onChange: (value: number) => void,
    error?: string,
    index: number = 0
  ) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 + 0.4 }}
      className={`space-y-2 ${isMobile ? "mb-6" : ""}`}
    >
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          {icon}
          <Label
            htmlFor={id}
            className={`font-medium ${isMobile ? "text-sm" : ""}`}
          >
            {label}
          </Label>
        </div>
        {renderTooltip(tooltip)}
      </div>
      <div className="flex items-center gap-4">
        <Input
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full dark:bg-gray-700"
        />
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-red-500 text-sm mt-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );

  // This function renders toggle switches with optimizations for mobile
  const renderToggle = (
    id: string,
    label: string,
    tooltip: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
    index: number = 0
  ) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`flex items-center justify-between ${
        isMobile ? "mb-4 bg-gray-800/20 p-3 rounded-lg" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        {isMobile ? null : <Target className="h-4 w-4 text-blue-500" />}
        <Label
          htmlFor={id}
          className={`${isMobile ? "text-sm" : "font-medium"}`}
        >
          {label}
        </Label>
        {renderTooltip(tooltip)}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className={`${isMobile ? "scale-90" : ""}`}
      />
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${isMobile ? "pt-1" : "pt-2"}`}
    >
      <Card
        className={`bg-gray-900 border-gray-800 dark:border-gray-700 dark:bg-gray-800 shadow-card ${
          isMobile ? "border-0 shadow-none bg-transparent" : ""
        }`}
      >
        {!isMobile && (
          <CardHeader className="space-y-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <Settings2 className="h-5 w-5" />
              <CardTitle>General Settings</CardTitle>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-gray-400"
            >
              Configure system-wide ejection parameters
            </motion.p>
          </CardHeader>
        )}
        <CardContent className={isMobile ? "p-0" : "space-y-6"}>
          {!isMobile && (
            <>
              {/* Add Analysis Mode Toggle before Timing Controls */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between p-4 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-blue-400" />
                  <div>
                    <Label htmlFor="analysisMode" className="font-medium">
                      Analysis Mode
                    </Label>
                    <p className="text-sm text-gray-400 mt-1">
                      Enable continuous analysis without ejection
                    </p>
                  </div>
                </div>
                <Switch
                  id="analysisMode"
                  checked={config.slave.analysisMode}
                  onCheckedChange={(checked) =>
                    updateConfig("slave.analysisMode", checked)
                  }
                  className="data-[state=checked]:bg-blue-500"
                />
              </motion.div>

              {/* Timing Controls Section */}
              <div className="space-y-4">
                <motion.h3
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm font-medium text-gray-400 flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Timing Controls
                </motion.h3>
                <div className="space-y-6 pl-4">
                  {renderTimeControl(
                    "pushTime",
                    "Push Duration",
                    "Duration of the push mechanism activation",
                    config.slave.pushTime,
                    <ArrowUpCircle className="h-4 w-4 text-green-400" />,
                    (value) => updateConfig("slave.pushTime", value),
                    validationErrors["slave.pushTime"],
                    0
                  )}
                  {renderTimeControl(
                    "ejectionTime",
                    "Ejection Duration",
                    "Duration of the ejection process",
                    config.slave.ejectionTime,
                    <Gauge className="h-4 w-4 text-blue-400" />,
                    (value) => updateConfig("slave.ejectionTime", value),
                    validationErrors["slave.ejectionTime"],
                    2
                  )}
                  {renderTimeControl(
                    "sensorDelayTime",
                    "Sensor Delay Time",
                    "Delay after detecting a block before starting ejection",
                    config.slave.sensorDelayTime,
                    <PauseCircle className="h-4 w-4 text-blue-400" />,
                    (value) => updateConfig("slave.sensorDelayTime", value),
                    validationErrors["slave.sensorDelayTime"],
                    1
                  )}
                </div>
              </div>

              <Separator className="bg-gray-800" />

              {/* Flipper Controls Section */}
              <div className="space-y-4 mt-8">
                <motion.h3
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm font-medium text-gray-400 flex items-center gap-2"
                >
                  <Settings2 className="h-4 w-4" />
                  Flipper Controls
                </motion.h3>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center justify-between p-4 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Settings2 className="h-4 w-4 text-blue-400" />
                    <div>
                      <Label htmlFor="flipperEnabled" className="font-medium">
                        Enable Flipper
                      </Label>
                      <p className="text-sm text-gray-400 mt-1">
                        Enable the automatic board flipping mechanism
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="flipperEnabled"
                    checked={config.slave.flipperEnabled}
                    onCheckedChange={(checked) =>
                      updateConfig("slave.flipperEnabled", checked)
                    }
                    className="data-[state=checked]:bg-blue-500"
                  />
                </motion.div>

                <div className="space-y-6 pl-4">
                  {renderTimeControl(
                    "flipperDelay",
                    "Flipper Delay",
                    "Delay before the flipper activates",
                    config.slave.flipperDelay,
                    <PauseCircle className="h-4 w-4 text-blue-400" />,
                    (value) => updateConfig("slave.flipperDelay", value),
                    validationErrors["slave.flipperDelay"],
                    0
                  )}

                  {renderTimeControl(
                    "flipperDuration",
                    "Flipper Duration",
                    "How long the flipper remains active",
                    config.slave.flipperDuration,
                    <Clock className="h-4 w-4 text-blue-400" />,
                    (value) => updateConfig("slave.flipperDuration", value),
                    validationErrors["slave.flipperDuration"],
                    1
                  )}
                </div>
              </div>

              <Separator className="bg-gray-800" />

              {/* Defect Detection Section */}
              <div className="space-y-4">
                <motion.h3
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm font-medium text-gray-400 flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Defect Detection Parameters
                </motion.h3>
                <div className="space-y-6 pl-4">
                  {/* Ejection Enabled Switch */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-800 dark:border-gray-700 bg-gray-950 dark:bg-gray-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-red-400" />
                      <div>
                        <Label
                          htmlFor="ejectionEnabled"
                          className="font-medium text-base"
                        >
                          Enable Ejection System
                        </Label>
                        <p className="text-sm text-gray-400 mt-1">
                          Master switch for the entire ejection system
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="ejectionEnabled"
                      checked={config.ejection.globalSettings.ejectionEnabled}
                      onCheckedChange={(checked) =>
                        updateConfig(
                          "ejection.globalSettings.ejectionEnabled",
                          checked
                        )
                      }
                      className="data-[state=checked]:bg-red-500"
                    />
                  </motion.div>

                  {/* Global Confidence Threshold */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="pb-5"
                  >
                    <Label
                      htmlFor="globalConfidenceThreshold"
                      className="flex items-center mb-2 text-sm font-medium"
                    >
                      Global Confidence Threshold
                      {renderTooltip(
                        "Minimum confidence score required for any detection to be considered"
                      )}
                    </Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <Slider
                          id="globalConfidenceThreshold"
                          min={0}
                          max={1}
                          step={0.01}
                          value={[
                            config.ejection.globalSettings
                              .globalConfidenceThreshold,
                          ]}
                          onValueChange={(value) =>
                            updateConfig(
                              "ejection.globalSettings.globalConfidenceThreshold",
                              value[0]
                            )
                          }
                          className="flex-1 dark:data-[state=active]:bg-gray-400 dark:data-[state=inactive]:bg-gray-600"
                        />
                        <motion.span
                          className="w-16 text-right font-mono"
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          {config.ejection.globalSettings.globalConfidenceThreshold?.toFixed(
                            2
                          )}
                        </motion.span>
                      </div>
                      {validationErrors["globalConfidenceThreshold"] && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-red-500 text-sm mt-1"
                        >
                          {validationErrors["globalConfidenceThreshold"]}
                        </motion.p>
                      )}
                    </div>
                  </motion.div>

                  {/* Multiple Defects Switch */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center justify-between p-4 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Target className="h-4 w-4 text-orange-400" />
                      <div>
                        <Label
                          htmlFor="requireMultipleDefects"
                          className="font-medium"
                        >
                          Require Multiple Defects
                        </Label>
                        <p className="text-sm text-gray-400 mt-1">
                          Eject only if multiple defects are detected
                        </p>
                      </div>
                    </div>
                    <Switch
                      className="dark:bg-gray-700"
                      id="requireMultipleDefects"
                      checked={
                        config.ejection.globalSettings.requireMultipleDefects
                      }
                      onCheckedChange={(checked) =>
                        updateConfig(
                          "ejection.globalSettings.requireMultipleDefects",
                          checked
                        )
                      }
                    />
                  </motion.div>

                  {/* Number Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderNumberInput(
                      "minTotalArea",
                      "Minimum Total Area",
                      "Minimum combined area of all defects to trigger ejection",
                      config.ejection.globalSettings.minTotalArea,
                      <Target className="h-4 w-4 text-yellow-400" />,
                      (value) =>
                        updateConfig(
                          "ejection.globalSettings.minTotalArea",
                          value
                        ),
                      validationErrors["minTotalArea"],
                      0
                    )}

                    {renderNumberInput(
                      "maxDefectsBeforeEject",
                      "Max Defects Before Eject",
                      "Maximum number of defects before forced ejection",
                      config.ejection.globalSettings.maxDefectsBeforeEject,
                      <Target className="h-4 w-4 text-red-400" />,
                      (value) =>
                        updateConfig(
                          "ejection.globalSettings.maxDefectsBeforeEject",
                          value
                        ),
                      validationErrors["maxDefectsBeforeEject"],
                      1
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {isMobile && (
            <div className={`${isMobile ? "space-y-6" : "space-y-6"}`}>
              {/* Analysis Mode Toggle for mobile */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between bg-gray-800/30 p-3 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-400" />
                  <div>
                    <Label
                      htmlFor="analysisMode_mobile"
                      className="font-medium text-sm"
                    >
                      Analysis Mode
                    </Label>
                    <p className="text-xs text-gray-400 mt-1">
                      Enable continuous analysis without ejection
                    </p>
                  </div>
                </div>
                <Switch
                  id="analysisMode_mobile"
                  checked={config.slave.analysisMode}
                  onCheckedChange={(checked) =>
                    updateConfig("slave.analysisMode", checked)
                  }
                  className="data-[state=checked]:bg-blue-500 scale-90"
                />
              </motion.div>

              {/* Timing Section - optimized for mobile */}
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-400 text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timing Controls
                </h3>
                <div className="grid grid-cols-1 gap-4 bg-gray-800/10 p-3 rounded-lg border border-gray-800/20">
                  {renderTimeControl(
                    "pushTime",
                    "Push Duration",
                    "Duration of the push mechanism activation",
                    config.slave.pushTime,
                    <ArrowUpCircle className="h-4 w-4 text-green-400" />,
                    (value) => updateConfig("slave.pushTime", value),
                    validationErrors["slave.pushTime"],
                    0
                  )}
                  {renderTimeControl(
                    "ejectionTime",
                    "Ejection Duration",
                    "Duration of the ejection process",
                    config.slave.ejectionTime,
                    <Gauge className="h-4 w-4 text-blue-400" />,
                    (value) => updateConfig("slave.ejectionTime", value),
                    validationErrors["slave.ejectionTime"],
                    1
                  )}
                  {renderTimeControl(
                    "sensorDelayTime",
                    "Sensor Delay Time",
                    "Delay after detecting a block before starting ejection",
                    config.slave.sensorDelayTime,
                    <PauseCircle className="h-4 w-4 text-blue-400" />,
                    (value) => updateConfig("slave.sensorDelayTime", value),
                    validationErrors["slave.sensorDelayTime"],
                    2
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Flipper Controls Section - mobile */}
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-400 text-sm flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Flipper Controls
                </h3>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center justify-between bg-gray-800/30 p-3 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-blue-400" />
                    <div>
                      <Label
                        htmlFor="flipperEnabled_mobile"
                        className="font-medium text-sm"
                      >
                        Enable Flipper
                      </Label>
                      <p className="text-xs text-gray-400 mt-1">
                        Enable board flipping mechanism
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="flipperEnabled_mobile"
                    checked={config.slave.flipperEnabled}
                    onCheckedChange={(checked) =>
                      updateConfig("slave.flipperEnabled", checked)
                    }
                    className="data-[state=checked]:bg-blue-500 scale-90"
                  />
                </motion.div>

                <div className="grid grid-cols-1 gap-4 bg-gray-800/10 p-3 rounded-lg border border-gray-800/20">
                  {renderTimeControl(
                    "flipperDelay",
                    "Flipper Delay",
                    "Delay before the flipper activates",
                    config.slave.flipperDelay,
                    <PauseCircle className="h-4 w-4 text-blue-400" />,
                    (value) => updateConfig("slave.flipperDelay", value),
                    validationErrors["slave.flipperDelay"],
                    0
                  )}
                  {renderTimeControl(
                    "flipperDuration",
                    "Flipper Duration",
                    "How long the flipper remains active",
                    config.slave.flipperDuration,
                    <Clock className="h-4 w-4 text-blue-400" />,
                    (value) => updateConfig("slave.flipperDuration", value),
                    validationErrors["slave.flipperDuration"],
                    1
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Defect Detection Section - mobile */}
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-400 text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Defect Detection Parameters
                </h3>

                {/* Ejection Enabled Switch */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-800/50 bg-gray-950/50"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-400" />
                    <div>
                      <Label
                        htmlFor="ejectionEnabled_mobile"
                        className="font-medium text-sm"
                      >
                        Enable Ejection System
                      </Label>
                      <p className="text-xs text-gray-400 mt-1">
                        Master switch for the entire ejection system
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="ejectionEnabled_mobile"
                    checked={config.ejection.globalSettings.ejectionEnabled}
                    onCheckedChange={(checked) =>
                      updateConfig(
                        "ejection.globalSettings.ejectionEnabled",
                        checked
                      )
                    }
                    className="data-[state=checked]:bg-red-500 scale-90"
                  />
                </motion.div>

                <div className="grid grid-cols-1 gap-4 bg-gray-800/10 p-3 rounded-lg border border-gray-800/20">
                  {/* Global Confidence Threshold */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label
                        htmlFor="globalConfidenceThreshold_mobile"
                        className="text-sm font-medium flex items-center"
                      >
                        <Gauge className="h-4 w-4 text-blue-400 mr-2" />
                        Global Confidence Threshold
                      </Label>
                      {renderTooltip(
                        "Minimum confidence score required for detection"
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="globalConfidenceThreshold_mobile"
                        min={0}
                        max={1}
                        step={0.01}
                        value={[
                          config.ejection.globalSettings
                            .globalConfidenceThreshold,
                        ]}
                        onValueChange={(value) =>
                          updateConfig(
                            "ejection.globalSettings.globalConfidenceThreshold",
                            value[0]
                          )
                        }
                        className="flex-1"
                      />
                      <div className="w-12 text-right font-mono">
                        {config.ejection.globalSettings.globalConfidenceThreshold?.toFixed(
                          2
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Multiple Defects Switch */}
                  <div className="p-2 border border-gray-800/30 rounded-lg">
                    {renderToggle(
                      "requireMultipleDefects_mobile",
                      "Require Multiple Defects",
                      "Eject only if multiple defects are detected",
                      config.ejection.globalSettings.requireMultipleDefects,
                      (value) =>
                        updateConfig(
                          "ejection.globalSettings.requireMultipleDefects",
                          value
                        ),
                      0
                    )}
                  </div>

                  {/* Number inputs in a nice grid */}
                  <div className="grid grid-cols-1 gap-4">
                    {renderNumberInput(
                      "minTotalArea_mobile",
                      "Minimum Total Area",
                      "Minimum combined area of defects to trigger ejection",
                      config.ejection.globalSettings.minTotalArea,
                      <Target className="h-4 w-4 text-yellow-400" />,
                      (value) =>
                        updateConfig(
                          "ejection.globalSettings.minTotalArea",
                          value
                        ),
                      validationErrors["minTotalArea"],
                      0
                    )}

                    {renderNumberInput(
                      "maxDefectsBeforeEject_mobile",
                      "Max Defects Before Eject",
                      "Maximum number of defects before forced ejection",
                      config.ejection.globalSettings.maxDefectsBeforeEject,
                      <Target className="h-4 w-4 text-red-400" />,
                      (value) =>
                        updateConfig(
                          "ejection.globalSettings.maxDefectsBeforeEject",
                          value
                        ),
                      validationErrors["maxDefectsBeforeEject"],
                      1
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default GlobalSettings;
