"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, ArrowUp, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface SystemSettings {
  speeds: {
    front: number;
    right: number;
    back: number;
    left: number;
  };
  maintenance: {
    lastMaintenanceDate: string;
    maintenanceInterval: number;
    primeTime: number;
    cleanTime: number;
  };
  pattern: {
    initialOffsets: {
      front: { x: number; y: number };
      right: { x: number; y: number };
      back: { x: number; y: number };
      left: { x: number; y: number };
    };
    travelDistance: {
      horizontal: {
        x: number;
        y: number;
      };
      vertical: {
        x: number;
        y: number;
      };
    };
    rows: {
      x: number;
      y: number;
    };
  };
}

interface PatternSettingsProps {
  settings: SystemSettings;
  onUpdate: (command: any) => void;
  wsConnected: boolean;
}

export function PatternSettings({
  settings,
  onUpdate,
  wsConnected,
}: PatternSettingsProps) {
  const [patternSettings, setPatternSettings] = useState<
    SystemSettings["pattern"]
  >({
    initialOffsets: {
      front: { x: 0, y: 0 },
      right: { x: 0, y: 0 },
      back: { x: 0, y: 0 },
      left: { x: 0, y: 0 },
    },
    travelDistance: {
      horizontal: { x: 0, y: 0 },
      vertical: { x: 0, y: 0 },
    },
    rows: { x: 0, y: 0 },
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings?.pattern) {
      setPatternSettings({
        initialOffsets: {
          front: {
            x: settings.pattern.initialOffsets?.front?.x ?? 0,
            y: settings.pattern.initialOffsets?.front?.y ?? 0,
          },
          right: {
            x: settings.pattern.initialOffsets?.right?.x ?? 0,
            y: settings.pattern.initialOffsets?.right?.y ?? 0,
          },
          back: {
            x: settings.pattern.initialOffsets?.back?.x ?? 0,
            y: settings.pattern.initialOffsets?.back?.y ?? 0,
          },
          left: {
            x: settings.pattern.initialOffsets?.left?.x ?? 0,
            y: settings.pattern.initialOffsets?.left?.y ?? 0,
          },
        },
        travelDistance: {
          horizontal: {
            x: settings.pattern.travelDistance?.horizontal?.x ?? 0,
            y: settings.pattern.travelDistance?.horizontal?.y ?? 0,
          },
          vertical: {
            x: settings.pattern.travelDistance?.vertical?.x ?? 0,
            y: settings.pattern.travelDistance?.vertical?.y ?? 0,
          },
        },
        rows: {
          x: settings.pattern.rows?.x ?? 0,
          y: settings.pattern.rows?.y ?? 0,
        },
      });
      setHasChanges(false);
    }
  }, [settings?.pattern]);

  const handleChange = (
    category: keyof SystemSettings["pattern"],
    subcategory: string,
    field: string,
    value: string
  ) => {
    const numValue = value === "" ? 0 : parseFloat(value);
    if (isNaN(numValue)) return;

    setPatternSettings((prev: SystemSettings["pattern"]) => {
      if (category === "rows") {
        return {
          ...prev,
          rows: {
            ...prev.rows,
            [field]: numValue,
          },
        };
      }

      return {
        ...prev,
        [category]: {
          ...prev[category],
          [subcategory]: {
            ...prev[category][
              subcategory as keyof (typeof prev)[typeof category]
            ],
            [field]: numValue,
          },
        },
      };
    });
    setHasChanges(true);
  };

  const handleOffsetChange = (
    direction: keyof SystemSettings["pattern"]["initialOffsets"],
    axis: "x" | "y",
    value: string
  ) => {
    const numValue = value === "" ? 0 : parseFloat(value);
    if (isNaN(numValue)) return;

    setPatternSettings((prev: SystemSettings["pattern"]) => ({
      ...prev,
      initialOffsets: {
        ...prev.initialOffsets,
        [direction]: {
          ...prev.initialOffsets[direction],
          [axis]: numValue,
        },
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      onUpdate({
        type: "UPDATE_SETTINGS",
        payload: {
          pattern: patternSettings,
        },
      });
      setHasChanges(false);
      toast.success("Pattern settings updated successfully");
    } catch (error) {
      toast.error("Failed to update pattern settings");
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          Pattern Settings
          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={!wsConnected}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Initial Offsets */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Initial Offsets
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Set the starting position offsets in inches for each direction
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {["front", "right", "back", "left"].map((direction) => (
              <div
                key={direction}
                className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-3"
              >
                <Label className="capitalize text-base font-medium text-emerald-600 dark:text-emerald-400">
                  {direction === "front"
                    ? "back"
                    : direction === "back"
                    ? "front"
                    : direction}
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor={`offset-${direction}-x`}
                      className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1"
                    >
                      X Offset <ArrowRight className="h-4 w-4" />
                    </Label>
                    <Input
                      id={`offset-${direction}-x`}
                      type="number"
                      value={
                        patternSettings?.initialOffsets?.[
                          direction as keyof SystemSettings["pattern"]["initialOffsets"]
                        ].x ?? 0
                      }
                      onChange={(e) =>
                        handleOffsetChange(
                          direction as keyof SystemSettings["pattern"]["initialOffsets"],
                          "x",
                          e.target.value
                        )
                      }
                      className="dark:bg-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor={`offset-${direction}-y`}
                      className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1"
                    >
                      Y Offset <ArrowUp className="h-4 w-4" />
                    </Label>
                    <Input
                      id={`offset-${direction}-y`}
                      type="number"
                      value={
                        patternSettings?.initialOffsets?.[
                          direction as keyof SystemSettings["pattern"]["initialOffsets"]
                        ].y ?? 0
                      }
                      onChange={(e) =>
                        handleOffsetChange(
                          direction as keyof SystemSettings["pattern"]["initialOffsets"],
                          "y",
                          e.target.value
                        )
                      }
                      className="dark:bg-gray-700"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Travel Distance */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Travel Distance
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure movement distances in inches for horizontal and vertical
              travel
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Horizontal Travel */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-3">
              <h4 className="text-base font-medium text-emerald-600 dark:text-emerald-400">
                Horizontal Orientation
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="horizontal-travel-x"
                    className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1"
                  >
                    X Distance <ArrowRight className="h-4 w-4" />
                  </Label>
                  <Input
                    id="horizontal-travel-x"
                    type="number"
                    value={patternSettings.travelDistance.horizontal.x}
                    onChange={(e) =>
                      handleChange(
                        "travelDistance",
                        "horizontal",
                        "x",
                        e.target.value
                      )
                    }
                    className="dark:bg-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="horizontal-travel-y"
                    className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1"
                  >
                    Y Distance <ArrowUp className="h-4 w-4" />
                  </Label>
                  <Input
                    id="horizontal-travel-y"
                    type="number"
                    value={patternSettings.travelDistance.horizontal.y}
                    onChange={(e) =>
                      handleChange(
                        "travelDistance",
                        "horizontal",
                        "y",
                        e.target.value
                      )
                    }
                    className="dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* Vertical Travel */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-3">
              <h4 className="text-base font-medium text-emerald-600 dark:text-emerald-400">
                Vertical Orientation
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="vertical-travel-x"
                    className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1"
                  >
                    X Distance <ArrowRight className="h-4 w-4" />
                  </Label>
                  <Input
                    id="vertical-travel-x"
                    type="number"
                    value={patternSettings.travelDistance.vertical.x}
                    onChange={(e) =>
                      handleChange(
                        "travelDistance",
                        "vertical",
                        "x",
                        e.target.value
                      )
                    }
                    className="dark:bg-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="vertical-travel-y"
                    className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1"
                  >
                    Y Distance <ArrowUp className="h-4 w-4" />
                  </Label>
                  <Input
                    id="vertical-travel-y"
                    type="number"
                    value={patternSettings.travelDistance.vertical.y}
                    onChange={(e) =>
                      handleChange(
                        "travelDistance",
                        "vertical",
                        "y",
                        e.target.value
                      )
                    }
                    className="dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Size */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Grid Size
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Define the number of rows and columns in the pattern grid
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="rows-x"
                  className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1"
                >
                  Columns <ArrowRight className="h-4 w-4" />
                </Label>
                <Input
                  id="rows-x"
                  type="number"
                  value={patternSettings.rows.x}
                  onChange={(e) =>
                    handleChange("rows", "rows", "x", e.target.value)
                  }
                  className="dark:bg-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="rows-y"
                  className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1"
                >
                  Rows <ArrowUp className="h-4 w-4" />
                </Label>
                <Input
                  id="rows-y"
                  type="number"
                  value={patternSettings.rows.y}
                  onChange={(e) =>
                    handleChange("rows", "rows", "y", e.target.value)
                  }
                  className="dark:bg-gray-700"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
