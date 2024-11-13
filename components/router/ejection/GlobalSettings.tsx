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

export type UpdateConfigFunction = (
  key: string,
  value: number | boolean | object
) => void;

export interface EjectionControlProps {
  config: EjectionSettings;
  updateConfig: UpdateConfigFunction;
  validationErrors: ValidationErrors;
}

export default function GlobalSettings({
  config,
  updateConfig,
  validationErrors,
}: EjectionControlProps) {
  const renderTooltip = (content: string) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Info className="h-4 w-4 ml-1" />
        </TooltipTrigger>
        <TooltipContent>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Card className="dark:border-gray-700">
      <CardHeader className="dark:bg-gray-800">
        <CardTitle>Global Settings</CardTitle>
      </CardHeader>
      <CardContent className="dark:bg-gray-800">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="ejectionDuration"
                className="flex items-center mb-2"
              >
                Ejection Duration (ms)
                {renderTooltip(
                  "Duration of the ejection process in milliseconds"
                )}
              </Label>
              <div className="flex items-center gap-4">
                <Slider
                  id="ejectionDuration"
                  min={100}
                  max={5000}
                  step={100}
                  value={[config.globalSettings.ejectionDuration]}
                  onValueChange={(value) =>
                    updateConfig("ejectionDuration", value[0]!)
                  }
                  className="flex-1 dark:data-[state=active]:bg-gray-400 dark:data-[state=inactive]:bg-gray-600"
                />
                <Input
                  type="number"
                  value={config.globalSettings.ejectionDuration}
                  onChange={(e) =>
                    updateConfig("ejectionDuration", parseInt(e.target.value))
                  }
                  className="w-24 dark:bg-gray-700"
                />
              </div>
              {validationErrors.ejectionDuration && (
                <span className="text-sm text-red-500">
                  {validationErrors.ejectionDuration}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="requireMultipleDefects"
                checked={config.globalSettings.requireMultipleDefects}
                onCheckedChange={(checked) =>
                  updateConfig("requireMultipleDefects", checked)
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
            </div>

            <div>
              <Label htmlFor="minTotalArea" className="flex items-center mb-2">
                Minimum Total Area
                {renderTooltip(
                  "Minimum combined area of all defects to trigger ejection"
                )}
              </Label>
              <Input
                id="minTotalArea"
                type="number"
                value={config.globalSettings.minTotalArea}
                onChange={(e) =>
                  updateConfig("minTotalArea", parseInt(e.target.value))
                }
                className="dark:bg-gray-700"
              />
              {validationErrors.minTotalArea && (
                <span className="text-sm text-red-500">
                  {validationErrors.minTotalArea}
                </span>
              )}
            </div>

            <div>
              <Label
                htmlFor="maxDefectsBeforeEject"
                className="flex items-center mb-2"
              >
                Max Defects Before Eject
                {renderTooltip(
                  "Maximum number of defects before forced ejection"
                )}
              </Label>
              <Input
                id="maxDefectsBeforeEject"
                type="number"
                value={config.globalSettings.maxDefectsBeforeEject}
                onChange={(e) =>
                  updateConfig(
                    "maxDefectsBeforeEject",
                    parseInt(e.target.value)
                  )
                }
                className="dark:bg-gray-700"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
