import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  const renderTooltip = (content: string) => (
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
      className="space-y-2"
    >
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          {icon}
          <Label htmlFor={id} className="font-medium">
            {label}
          </Label>
        </div>
        {renderTooltip(tooltip)}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Slider
            id={id}
            min={0.1}
            max={10}
            step={0.1}
            value={[value / 1000]}
            onValueChange={(value) => onChange(value[0] * 1000)}
            className="flex-1 [&>.relative>div:last-child]:dark:bg-gray-700"
          />
        </div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.2 }}
        >
          <Input
            type="number"
            value={(value / 1000).toFixed(1)}
            onChange={(e) => onChange(parseFloat(e.target.value) * 1000)}
            className="w-20 text-right dark:bg-gray-700"
          />
        </motion.div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.3 }}
          className="text-sm text-gray-400 w-8"
        >
          sec
        </motion.span>
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
      className="space-y-2"
    >
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          {icon}
          <Label htmlFor={id} className="font-medium">
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="pt-2"
    >
      <Card className="bg-gray-900 border-gray-800 dark:border-gray-700 dark:bg-gray-800 shadow-card">
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
        <CardContent className="space-y-6">
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
                validationErrors.pushTime,
                0
              )}
              {renderTimeControl(
                "riserTime",
                "Riser Duration",
                "Duration of the riser activation",
                config.slave.riserTime,
                <ArrowUpCircle className="h-4 w-4 text-purple-400" />,
                (value) => updateConfig("slave.riserTime", value),
                validationErrors.riserTime,
                1
              )}
              {renderTimeControl(
                "ejectionTime",
                "Ejection Duration",
                "Duration of the ejection process",
                config.slave.ejectionTime,
                <Gauge className="h-4 w-4 text-blue-400" />,
                (value) => updateConfig("slave.ejectionTime", value),
                validationErrors.ejectionTime,
                2
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
                    updateConfig("ejection.globalSettings.minTotalArea", value),
                  validationErrors.minTotalArea,
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
                  validationErrors.maxDefectsBeforeEject,
                  1
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default GlobalSettings;
