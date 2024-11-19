"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import { EjectionSettings, ValidationErrors } from "@/typings/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

export type UpdateConfigFunction = (
  key: string,
  value: number | boolean | object
) => void;

export interface EjectionControlProps {
  config: EjectionSettings;
  updateConfig: UpdateConfigFunction;
  validationErrors: ValidationErrors;
}

const SliderInput = motion(Input);
const AnimatedCard = motion(Card);

export default function GlobalSettings({
  config,
  updateConfig,
  validationErrors,
}: EjectionControlProps) {
  const renderTooltip = (content: string) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Info className="h-4 w-4 ml-1" />
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const renderSliderControl = (
    id: string,
    label: string,
    tooltip: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void,
    error?: string,
    parseFunction: (value: string) => number = parseInt
  ) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Label htmlFor={id} className="flex items-center mb-2">
        {label}
        {renderTooltip(tooltip)}
      </Label>
      <div className="flex items-center gap-4">
        <motion.div className="flex-1" whileHover={{ scale: 1.01 }}>
          <Slider
            id={id}
            min={min}
            max={max}
            step={step}
            value={[value / 1000]}
            onValueChange={(value) => onChange(value[0]!)}
            className="flex-1 dark:data-[state=active]:bg-gray-400 dark:data-[state=inactive]:bg-gray-600"
          />
        </motion.div>
        <SliderInput
          type="number"
          value={value / 1000}
          onChange={(e) => onChange(parseFunction(e.target.value))}
          className="w-24 dark:bg-gray-700"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
      </div>
      <AnimatePresence>
        {error && (
          <motion.span
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-red-500 block"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <AnimatedCard
      className="dark:border-gray-700"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <CardHeader className="dark:bg-gray-800">
        <CardTitle>Global Settings</CardTitle>
      </CardHeader>
      <CardContent className="dark:bg-gray-800">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderSliderControl(
              "ejectionDuration",
              "Ejection Duration (ms)",
              "Duration of the ejection process in milliseconds",
              config.globalSettings.ejectionDuration,
              0.1,
              10,
              0.1,
              (value) =>
                updateConfig("globalSettings.ejectionDuration", 1000 * value),
              validationErrors.ejectionDuration
            )}

            {renderSliderControl(
              "pistonDuration",
              "Piston Duration (s)",
              "Duration of the piston activation in seconds",
              config.globalSettings.pistonDuration,
              0.1,
              10,
              0.1,
              (value) =>
                updateConfig("globalSettings.pistonDuration", 1000 * value),
              validationErrors.pistonDuration,
              parseFloat
            )}

            {renderSliderControl(
              "riserDuration",
              "Riser Duration (s)",
              "Duration of the riser activation in seconds",
              config.globalSettings.riserDuration,
              0.1,
              10,
              0.1,
              (value) =>
                updateConfig("globalSettings.riserDuration", 1000 * value),
              validationErrors.riserDuration,
              parseFloat
            )}

            <motion.div
              className="flex items-center space-x-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Switch
                id="requireMultipleDefects"
                checked={config.globalSettings.requireMultipleDefects}
                onCheckedChange={(checked) =>
                  updateConfig("globalSettings.requireMultipleDefects", checked)
                }
                className="data-[state=checked]:bg-gray-400 dark:data-[state=checked]:bg-gray-600 dark:data-[state=unchecked]:bg-gray-700"
              />
              <Label
                htmlFor="requireMultipleDefects"
                className="flex items-center"
              >
                Require Multiple Defects
                {renderTooltip("Eject only if multiple defects are detected")}
              </Label>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Label htmlFor="minTotalArea" className="flex items-center mb-2">
                Minimum Total Area
                {renderTooltip(
                  "Minimum combined area of all defects to trigger ejection"
                )}
              </Label>
              <motion.div whileHover={{ scale: 1.01 }}>
                <Input
                  id="minTotalArea"
                  type="number"
                  value={config.globalSettings.minTotalArea}
                  onChange={(e) =>
                    updateConfig(
                      "globalSettings.minTotalArea",
                      parseInt(e.target.value)
                    )
                  }
                  className="dark:bg-gray-700"
                />
              </motion.div>
              <AnimatePresence>
                {validationErrors.minTotalArea && (
                  <motion.span
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-red-500 block"
                  >
                    {validationErrors.minTotalArea}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Label
                htmlFor="maxDefectsBeforeEject"
                className="flex items-center mb-2"
              >
                Max Defects Before Eject
                {renderTooltip(
                  "Maximum number of defects before forced ejection"
                )}
              </Label>
              <motion.div whileHover={{ scale: 1.01 }}>
                <Input
                  id="maxDefectsBeforeEject"
                  type="number"
                  value={config.globalSettings.maxDefectsBeforeEject}
                  onChange={(e) =>
                    updateConfig(
                      "globalSettings.maxDefectsBeforeEject",
                      parseInt(e.target.value)
                    )
                  }
                  className="dark:bg-gray-700"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </CardContent>
    </AnimatedCard>
  );
}
