"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, ArrowUp, ArrowRight, FolderOpen, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface SystemSettings {
  speeds: {
    front: number;
    right: number;
    back: number;
    left: number;
    lip: number;
  };
  maintenance: {
    lastMaintenanceDate: string;
    maintenanceInterval: number;
    primeTime: number;
    cleanTime: number;
  };
  pattern: {
    initialOffsets: {
      front: { x: number; y: number; angle: number };
      right: { x: number; y: number; angle: number };
      back: { x: number; y: number; angle: number };
      left: { x: number; y: number; angle: number };
      lip: { x: number; y: number; angle: number };
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
      lip: {
        x: number;
        y: number;
      };
    };
    rows: {
      x: number;
      y: number;
    };
    enabledSides: {
      front: boolean;
      right: boolean;
      back: boolean;
      left: boolean;
      lip: boolean;
    };
  };
}

interface SavedConfig {
  name: string;
  description?: string;
  timestamp: string;
}

interface PatternSettingsProps {
  settings: SystemSettings;
  onUpdate: (command: any) => void;
  wsConnected: boolean;
  configs?: SavedConfig[];
}

export function PatternSettings({
  settings,
  onUpdate,
  wsConnected,
  configs,
}: PatternSettingsProps) {
  const [patternSettings, setPatternSettings] = useState<
    SystemSettings["pattern"]
  >({
    initialOffsets: {
      front: { x: 0, y: 0, angle: 0 },
      right: { x: 0, y: 0, angle: 0 },
      back: { x: 0, y: 0, angle: 0 },
      left: { x: 0, y: 0, angle: 0 },
      lip: { x: 0, y: 0, angle: 0 },
    },
    travelDistance: {
      horizontal: { x: 0, y: 0 },
      vertical: { x: 0, y: 0 },
      lip: { x: 0, y: 0 },
    },
    rows: { x: 0, y: 0 },
    enabledSides: {
      front: true,
      right: true,
      back: true,
      left: true,
      lip: true,
    },
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [configName, setConfigName] = useState("");
  const [configDescription, setConfigDescription] = useState("");

  useEffect(() => {
    if (settings?.pattern) {
      setPatternSettings({
        initialOffsets: {
          front: {
            x: settings.pattern.initialOffsets?.front?.x ?? 0,
            y: settings.pattern.initialOffsets?.front?.y ?? 0,
            angle: settings.pattern.initialOffsets?.front?.angle ?? 0,
          },
          right: {
            x: settings.pattern.initialOffsets?.right?.x ?? 0,
            y: settings.pattern.initialOffsets?.right?.y ?? 0,
            angle: settings.pattern.initialOffsets?.right?.angle ?? 0,
          },
          back: {
            x: settings.pattern.initialOffsets?.back?.x ?? 0,
            y: settings.pattern.initialOffsets?.back?.y ?? 0,
            angle: settings.pattern.initialOffsets?.back?.angle ?? 0,
          },
          left: {
            x: settings.pattern.initialOffsets?.left?.x ?? 0,
            y: settings.pattern.initialOffsets?.left?.y ?? 0,
            angle: settings.pattern.initialOffsets?.left?.angle ?? 0,
          },
          lip: {
            x: settings.pattern.initialOffsets?.lip?.x ?? 0,
            y: settings.pattern.initialOffsets?.lip?.y ?? 0,
            angle: settings.pattern.initialOffsets?.lip?.angle ?? 0,
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
          lip: {
            x: settings.pattern.travelDistance?.lip?.x ?? 0,
            y: settings.pattern.travelDistance?.lip?.y ?? 0,
          },
        },
        rows: {
          x: settings.pattern.rows?.x ?? 0,
          y: settings.pattern.rows?.y ?? 0,
        },
        enabledSides: {
          front: settings.pattern.enabledSides?.front ?? true,
          right: settings.pattern.enabledSides?.right ?? true,
          back: settings.pattern.enabledSides?.back ?? true,
          left: settings.pattern.enabledSides?.left ?? true,
          lip: settings.pattern.enabledSides?.lip ?? true,
        },
      });
      setHasChanges(false);
    }
  }, [settings?.pattern]);

  useEffect(() => {
    if (wsConnected) {
      onUpdate({ type: "GET_CONFIGS" });
    }
  }, [wsConnected, onUpdate]);

  const handleChange = (
    category: keyof SystemSettings["pattern"],
    subcategory: string,
    field: string,
    value: string
  ) => {
    const numValue = value === "" ? "" : parseFloat(value);
    if (typeof numValue === "number" && isNaN(numValue)) return;

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
    const numValue = value === "" ? "" : parseFloat(value);
    if (typeof numValue === "number" && isNaN(numValue)) return;

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

  const handleAngleChange = (
    direction: keyof SystemSettings["pattern"]["initialOffsets"],
    value: string
  ) => {
    const numValue = value === "" ? "" : parseFloat(value);
    if (typeof numValue === "number" && isNaN(numValue)) return;

    setPatternSettings((prev) => ({
      ...prev,
      initialOffsets: {
        ...prev.initialOffsets,
        [direction]: {
          ...prev.initialOffsets[direction],
          angle: numValue,
        },
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      const settingsToSave = JSON.parse(JSON.stringify(patternSettings));

      Object.keys(settingsToSave.initialOffsets).forEach((direction) => {
        const offset = settingsToSave.initialOffsets[direction];
        offset.x = offset.x === "" ? 0 : offset.x;
        offset.y = offset.y === "" ? 0 : offset.y;
        offset.angle = offset.angle === "" ? 0 : offset.angle;
      });

      Object.keys(settingsToSave.travelDistance).forEach((orientation) => {
        const travel = settingsToSave.travelDistance[orientation];
        travel.x = travel.x === "" ? 0 : travel.x;
        travel.y = travel.y === "" ? 0 : travel.y;
      });

      settingsToSave.rows.x =
        settingsToSave.rows.x === "" ? 0 : settingsToSave.rows.x;
      settingsToSave.rows.y =
        settingsToSave.rows.y === "" ? 0 : settingsToSave.rows.y;

      onUpdate({
        type: "UPDATE_SETTINGS",
        payload: {
          pattern: settingsToSave,
        },
      });
      setHasChanges(false);
      toast.success("Pattern settings updated successfully");
    } catch (error) {
      toast.error("Failed to update pattern settings");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && hasChanges && wsConnected) {
      handleSave();
    }
  };

  const handleSaveConfig = () => {
    onUpdate({
      type: "SAVE_CONFIG",
      payload: {
        name: configName,
        description: configDescription,
      },
    });
    setShowSaveDialog(false);
    setConfigName("");
    setConfigDescription("");
  };

  const handleLoadConfig = (name: string) => {
    onUpdate({
      type: "LOAD_CONFIG",
      payload: { name },
    });
  };

  const handleSideToggle = (
    side: keyof SystemSettings["pattern"]["enabledSides"]
  ) => {
    setPatternSettings((prev) => {
      if (!prev) return prev;
      const currentSettings = prev as SystemSettings["pattern"];
      return {
        ...currentSettings,
        enabledSides: {
          ...currentSettings.enabledSides,
          [side]: !currentSettings.enabledSides[side],
        },
      };
    });
    setHasChanges(true);
  };

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          Pattern Settings
          <div className="flex items-center gap-2">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="ml-2 border-gray-200 dark:border-gray-700 
                    hover:bg-gray-50 dark:hover:bg-gray-700/50
                    text-gray-700 dark:text-gray-300 dark:bg-gray-700"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Configs
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border dark:border-gray-700 bg-white dark:bg-gray-800/90 backdrop-blur-sm"
              >
                <DropdownMenuItem
                  onClick={() => setShowSaveDialog(true)}
                  className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-gray-700 dark:text-gray-200">
                    Save New Config
                  </span>
                </DropdownMenuItem>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                {configs?.map((config, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={() => handleLoadConfig(config.name)}
                    className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  >
                    <span className="text-gray-700 dark:text-gray-200">
                      {config.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(config.timestamp).toLocaleDateString()}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Enabled Sides Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Enabled Sides</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(patternSettings.enabledSides).map(
              ([side, enabled]) => (
                <div
                  key={side}
                  className="flex flex-col items-center p-4 bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                >
                  <Label htmlFor={`${side}-toggle`} className="mb-2 capitalize">
                    {side}
                  </Label>
                  <Switch
                    id={`${side}-toggle`}
                    checked={enabled}
                    onCheckedChange={() =>
                      handleSideToggle(
                        side as keyof SystemSettings["pattern"]["enabledSides"]
                      )
                    }
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              )
            )}
          </div>
        </div>

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
            {["front", "right", "back", "left", "lip"].map((direction) => (
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
                <div className="grid grid-cols-3 gap-4">
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
                      onKeyDown={handleKeyDown}
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
                      onKeyDown={handleKeyDown}
                      className="dark:bg-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor={`offset-${direction}-angle`}
                      className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1"
                    >
                      Gun Angle
                    </Label>
                    <Input
                      id={`offset-${direction}-angle`}
                      type="number"
                      value={
                        patternSettings?.initialOffsets?.[
                          direction as keyof SystemSettings["pattern"]["initialOffsets"]
                        ].angle ?? 0
                      }
                      onChange={(e) =>
                        handleAngleChange(
                          direction as keyof SystemSettings["pattern"]["initialOffsets"],
                          e.target.value
                        )
                      }
                      onKeyDown={handleKeyDown}
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
                    onKeyDown={handleKeyDown}
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
                    onKeyDown={handleKeyDown}
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
                    onKeyDown={handleKeyDown}
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
                    onKeyDown={handleKeyDown}
                    className="dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* Lip Travel */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-3">
              <h4 className="text-base font-medium text-emerald-600 dark:text-emerald-400">
                Lip Pattern
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="lip-travel-x"
                    className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1"
                  >
                    X Distance <ArrowRight className="h-4 w-4" />
                  </Label>
                  <Input
                    id="lip-travel-x"
                    type="number"
                    value={patternSettings.travelDistance.lip.x}
                    onChange={(e) =>
                      handleChange("travelDistance", "lip", "x", e.target.value)
                    }
                    onKeyDown={handleKeyDown}
                    className="dark:bg-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="lip-travel-y"
                    className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1"
                  >
                    Y Distance <ArrowUp className="h-4 w-4" />
                  </Label>
                  <Input
                    id="lip-travel-y"
                    type="number"
                    value={patternSettings.travelDistance.lip.y}
                    onChange={(e) =>
                      handleChange("travelDistance", "lip", "y", e.target.value)
                    }
                    onKeyDown={handleKeyDown}
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
                  onKeyDown={handleKeyDown}
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
                  onKeyDown={handleKeyDown}
                  className="dark:bg-gray-700"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-white dark:bg-gray-800 border dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              Save Configuration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Name</Label>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Enter configuration name"
                className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600
                  focus:border-blue-500 dark:focus:border-blue-400
                  placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">
                Description (optional)
              </Label>
              <Input
                value={configDescription}
                onChange={(e) => setConfigDescription(e.target.value)}
                placeholder="Enter description"
                className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600
                  focus:border-blue-500 dark:focus:border-blue-400
                  placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              className="border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={!configName}
              className="bg-blue-500 hover:bg-blue-600 text-white
                disabled:bg-blue-500/50 dark:disabled:bg-blue-500/30"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
