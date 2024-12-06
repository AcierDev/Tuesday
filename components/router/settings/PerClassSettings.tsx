"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RouterSettings, ClassName } from "@/typings/types";

const SIZE_OPTIONS = {
  small: { label: "Small", value: 0.0001 },
  medium: { label: "Medium", value: 0.0005 },
  large: { label: "Large", value: 0.001 },
};

interface PerClassSettingsProps {
  config: RouterSettings;
  updateConfig: (path: string, value: any) => void;
  validationErrors: {
    [key: string]: string;
  };
}

export default function PerClassSettings({
  config,
  updateConfig,
  validationErrors,
}: PerClassSettingsProps) {
  const classSettings = config.ejection.perClassSettings;

  const renderTooltip = (content) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 ml-1 text-gray-400 hover:text-gray-300 transition-colors" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const renderValidationError = (key) => {
    if (validationErrors[key]) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-2 mt-1 text-sm text-red-500"
          role="alert"
        >
          <AlertCircle className="h-4 w-4" />
          <span>{validationErrors[key]}</span>
        </motion.div>
      );
    }
    return null;
  };

  const getSelectedSize = (minArea) => {
    const closest = Object.entries(SIZE_OPTIONS).reduce(
      (prev, [key, option]) => {
        if (
          Math.abs(option.value - minArea) <
          Math.abs(SIZE_OPTIONS[prev].value - minArea)
        ) {
          return key;
        }
        return prev;
      },
      "medium"
    );
    return closest;
  };

  const hasErrors = (className) =>
    Object.keys(validationErrors).some((key) => key.startsWith(className));

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        {Object.entries(classSettings).map(
          ([className, classConfig], index) => (
            <motion.div key={className as ClassName}>
              <Card
                className={`transition-all duration-300 ${
                  classConfig.enabled ? "opacity-100" : "opacity-50"
                } dark:bg-gray-800 dark:border-none hover:dark:border-gray-700 overflow-hidden`}
              >
                <CardHeader className="py-4">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">
                        {className.charAt(0).toUpperCase() + className.slice(1)}
                      </span>
                      <motion.div
                        className="flex items-center gap-2"
                        whileTap={{ scale: 0.95 }}
                      >
                        <Switch
                          id={`${className}-enabled`}
                          checked={classConfig.enabled}
                          onCheckedChange={(checked) =>
                            updateConfig(
                              `ejection.perClassSettings.${className}.enabled`,
                              checked
                            )
                          }
                          className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                        />
                        <Label
                          htmlFor={`${className}-enabled`}
                          className="text-sm text-gray-500 dark:text-gray-400"
                        >
                          {classConfig.enabled ? "Enabled" : "Disabled"}
                        </Label>
                      </motion.div>
                    </div>
                    {hasErrors(className) && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                      >
                        <AlertCircle
                          className="h-5 w-5 text-red-500"
                          aria-label="Validation errors present"
                        />
                      </motion.div>
                    )}
                  </CardTitle>
                </CardHeader>
                <motion.div
                  initial={false}
                  animate={{
                    height: classConfig.enabled ? "auto" : 0,
                    opacity: classConfig.enabled ? 1 : 0,
                  }}
                  transition={{
                    height: { duration: 0.3, ease: "easeInOut" },
                    opacity: { duration: 0.2, ease: "easeInOut" },
                  }}
                  className="overflow-hidden"
                >
                  <CardContent className="pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pr-1">
                      <div className="pb-5">
                        <Label
                          htmlFor={`${className}-minConfidence`}
                          className="flex items-center mb-2 text-sm font-medium"
                        >
                          Min Confidence
                          {renderTooltip(
                            "Minimum confidence score required for detection"
                          )}
                        </Label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-4">
                            <Slider
                              id={`${className}-minConfidence`}
                              min={0}
                              max={1}
                              step={0.01}
                              value={[classConfig.minConfidence]}
                              onValueChange={(value) =>
                                updateConfig(
                                  `ejection.perClassSettings.${className}.minConfidence`,
                                  value[0]
                                )
                              }
                              disabled={!classConfig.enabled}
                              className="flex-1 dark:data-[state=active]:bg-gray-400 dark:data-[state=inactive]:bg-gray-600"
                            />
                            <motion.span
                              className="w-16 text-right font-mono"
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              {classConfig.minConfidence.toFixed(2)}
                            </motion.span>
                          </div>
                          {renderValidationError(`${className}.minConfidence`)}
                        </div>
                      </div>

                      <div>
                        <Label
                          htmlFor={`${className}-minArea`}
                          className="flex items-center mb-2 text-sm font-medium"
                        >
                          Size Threshold
                          {renderTooltip(
                            "Minimum area size required for detection"
                          )}
                        </Label>
                        <div className="space-y-2">
                          <Select
                            value={getSelectedSize(classConfig.minArea)}
                            onValueChange={(value) =>
                              updateConfig(
                                `ejection.perClassSettings.${className}.minArea`,
                                SIZE_OPTIONS[value].value
                              )
                            }
                            disabled={!classConfig.enabled}
                          >
                            <SelectTrigger className="w-full dark:bg-gray-700 transition-colors duration-200 hover:dark:bg-gray-600 focus:dark:bg-gray-600">
                              <SelectValue
                                className="flex items-center"
                                placeholder="Select size"
                              />
                            </SelectTrigger>
                            <SelectContent
                              className="dark:bg-gray-700"
                              position="popper"
                              sideOffset={4}
                            >
                              {Object.entries(SIZE_OPTIONS).map(
                                ([key, option]) => (
                                  <SelectItem
                                    key={key}
                                    value={key}
                                    className="dark:bg-gray-700 transition-colors duration-200 hover:dark:bg-gray-600 focus:dark:bg-gray-600 flex items-center justify-between group"
                                  >
                                    <span>
                                      {option.label} ({option.value * 100}%)
                                    </span>
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                          {renderValidationError(`${className}.minArea`)}
                        </div>
                      </div>

                      <div>
                        <Label
                          htmlFor={`${className}-maxCount`}
                          className="flex items-center mb-2 text-sm font-medium"
                        >
                          Max Count
                          {renderTooltip(
                            "Maximum number of defects allowed before ejection"
                          )}
                        </Label>
                        <div className="space-y-2">
                          <Input
                            id={`${className}-maxCount`}
                            type="number"
                            min="0"
                            value={classConfig.maxCount}
                            onChange={(e) =>
                              updateConfig(
                                `ejection.perClassSettings.${className}.maxCount`,
                                parseInt(e.target.value) || 0
                              )
                            }
                            disabled={!classConfig.enabled}
                            className="dark:bg-gray-700 transition-colors duration-200 hover:dark:bg-gray-600 focus:dark:bg-gray-600"
                          />
                          {renderValidationError(`${className}.maxCount`)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </motion.div>
              </Card>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </motion.div>
  );
}
