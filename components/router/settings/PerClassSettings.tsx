"use client";

import React, { useState, useEffect } from "react";
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

const PerClassSettings = ({
  config,
  updateConfig,
  validationErrors,
}: PerClassSettingsProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const classSettings = config.ejection.perClassSettings;

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

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 ml-1 text-gray-400 hover:text-gray-300 transition-colors" />
          </TooltipTrigger>
          <TooltipContent className="bg-gray-800 text-gray-100 border-gray-700">
            <p className="text-sm">{content}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderValidationError = (key: string) => {
    if (!validationErrors[key]) return null;
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
        className="flex items-center gap-2 mt-1 text-sm text-red-500"
        role="alert"
      >
        <AlertCircle className="h-4 w-4" />
        <span>{validationErrors[key]}</span>
      </motion.div>
    );
  };

  const getSelectedSize = (minArea: number) => {
    type SizeKey = keyof typeof SIZE_OPTIONS;

    const closest = Object.entries(SIZE_OPTIONS).reduce<SizeKey>(
      (prev, [key, option]) => {
        if (
          Math.abs(option.value - minArea) <
          Math.abs(SIZE_OPTIONS[prev].value - minArea)
        ) {
          return key as SizeKey;
        }
        return prev;
      },
      "medium"
    );
    return closest;
  };

  const hasErrors = (className: string) =>
    Object.keys(validationErrors).some((key) => key.startsWith(className));

  const toggleClass = (className: string) => {
    setExpandedClass(expandedClass === className ? null : className);
  };

  // Render desktop view
  if (!isMobile) {
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
              <motion.div
                key={className as ClassName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.1, // Stagger the animations
                }}
              >
                <Card
                  className={`transition-all duration-300 ${
                    classConfig.enabled ? "opacity-100" : "opacity-50"
                  } dark:bg-gray-800 dark:border-none hover:dark:border-gray-700 overflow-hidden`}
                >
                  <CardHeader className="py-4">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="font-medium">
                          {className.charAt(0).toUpperCase() +
                            className.slice(1)}
                        </span>
                        <motion.div
                          className="flex items-center gap-2"
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.05 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          }}
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
                      scale: classConfig.enabled ? 1 : 0.98,
                    }}
                    transition={{
                      height: { duration: 0.3, ease: "easeInOut" },
                      opacity: { duration: 0.2, ease: "easeInOut" },
                      scale: { duration: 0.2, ease: "easeInOut" },
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
                            {renderValidationError(
                              `${className}.minConfidence`
                            )}
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
                              onValueChange={(
                                value: keyof typeof SIZE_OPTIONS
                              ) =>
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

  // Mobile view
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="pt-1"
    >
      <Card className="bg-gray-900 border-gray-800 dark:border-gray-700 dark:bg-gray-800 shadow-md border-0 shadow-none bg-transparent">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(config.ejection.perClassSettings).map(
              ([className, settings], index) => (
                <motion.div
                  key={className}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="mb-3 bg-gray-950/30 rounded-lg p-4 border border-gray-800/50 shadow-sm"
                  onClick={() => toggleClass(className)}
                >
                  <div className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`
                        w-3 h-3 rounded-full 
                        ${
                          className === "corner"
                            ? "bg-yellow-500"
                            : className === "crack"
                            ? "bg-red-500"
                            : className === "damage"
                            ? "bg-purple-500"
                            : className === "knot"
                            ? "bg-green-500"
                            : className === "edge"
                            ? "bg-blue-500"
                            : className === "router"
                            ? "bg-teal-500"
                            : className === "side"
                            ? "bg-orange-500"
                            : "bg-gray-500"
                        }
                      `}
                      ></span>
                      <h3 className="font-medium text-sm">
                        {className.charAt(0).toUpperCase() + className.slice(1)}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <motion.div
                        animate={{
                          rotate: expandedClass === className ? 180 : 0,
                          opacity: 1,
                        }}
                        initial={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Info className="h-4 w-4 text-gray-400" />
                      </motion.div>
                      <Switch
                        id={`${className}-enabled`}
                        checked={settings.enabled}
                        onCheckedChange={(checked) =>
                          updateConfig(
                            `ejection.perClassSettings.${className}.enabled`,
                            checked
                          )
                        }
                        className="scale-90"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedClass === className && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4 mt-4 pt-2 border-t border-gray-800/50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Confidence threshold */}
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Label
                              htmlFor={`${className}-confidence`}
                              className="font-medium text-xs"
                            >
                              Confidence Threshold
                            </Label>
                            {renderTooltip(
                              "Minimum confidence score required for detection"
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Slider
                              id={`${className}-confidence`}
                              min={0}
                              max={1}
                              step={0.01}
                              value={[settings.minConfidence]}
                              onValueChange={(value) =>
                                updateConfig(
                                  `ejection.perClassSettings.${className}.minConfidence`,
                                  value[0]
                                )
                              }
                              className="flex-1"
                            />
                            <div className="w-12 text-right font-mono">
                              {settings.minConfidence.toFixed(2)}
                            </div>
                          </div>
                          {renderValidationError(`${className}.minConfidence`)}
                        </div>

                        {/* Area threshold */}
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Label
                              htmlFor={`${className}-area`}
                              className="font-medium text-xs"
                            >
                              Minimum Area
                            </Label>
                            {renderTooltip(
                              "Minimum size of the defect to be detected"
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Select
                              value={getSelectedSize(settings.minArea)}
                              onValueChange={(value) =>
                                updateConfig(
                                  `ejection.perClassSettings.${className}.minArea`,
                                  SIZE_OPTIONS[
                                    value as keyof typeof SIZE_OPTIONS
                                  ].value
                                )
                              }
                            >
                              <SelectTrigger
                                className="w-full h-8 text-sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <SelectValue placeholder="Select size" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(SIZE_OPTIONS).map(
                                  ([key, { label }]) => (
                                    <SelectItem key={key} value={key}>
                                      {label}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              min={0}
                              value={settings.minArea}
                              onChange={(e) =>
                                updateConfig(
                                  `ejection.perClassSettings.${className}.minArea`,
                                  parseFloat(e.target.value)
                                )
                              }
                              className="w-full h-8 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          {renderValidationError(`${className}.minArea`)}
                        </div>

                        {/* Max count */}
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Label
                              htmlFor={`${className}-maxCount`}
                              className="font-medium text-xs"
                            >
                              Maximum Count
                            </Label>
                            {renderTooltip(
                              "Maximum number of this defect type allowed before ejection"
                            )}
                          </div>
                          <Input
                            id={`${className}-maxCount`}
                            type="number"
                            min={1}
                            value={settings.maxCount}
                            onChange={(e) =>
                              updateConfig(
                                `ejection.perClassSettings.${className}.maxCount`,
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full h-8 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                          {renderValidationError(`${className}.maxCount`)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PerClassSettings;
