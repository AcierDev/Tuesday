import React, { useMemo } from "react";
import { Target, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ROIController from "./RegionController";
import { RouterSettings, Region } from "@/typings/types";

interface AdvancedSettingsProps {
  config: RouterSettings;
  updateConfig: (path: string, value: any) => void;
  imageSrc: string;
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

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  config,
  updateConfig,
  imageSrc,
}) => {
  // Convert config regions to the format expected by ROIController
  const regions = useMemo(() => {
    const roi = {
      ...config.ejection.advancedSettings.regionOfInterest,
      type: "roi" as const,
      id: "main-roi",
    };

    const exclusions = config.ejection.advancedSettings.exclusionZones.map(
      (zone, index) => ({
        ...zone,
        type: "exclusion" as const,
        id: `exclusion-${index}`,
      })
    );

    return [roi, ...exclusions];
  }, [
    config.ejection.advancedSettings.regionOfInterest,
    config.ejection.advancedSettings.exclusionZones,
  ]);

  // Handle regions updates from ROIController
  const handleRegionsChange = (newRegions: Region[]) => {
    const roi = newRegions.find((r) => r.type === "roi");
    const exclusions = newRegions.filter((r) => r.type === "exclusion");

    if (roi) {
      const { x, y, width, height } = roi;
      updateConfig("ejection.advancedSettings.regionOfInterest", {
        x,
        y,
        width,
        height,
      });
    }

    updateConfig(
      "ejection.advancedSettings.exclusionZones",
      exclusions.map(({ x, y, width, height }) => ({
        x,
        y,
        width,
        height,
      }))
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900/5 dark:bg-gray-800 backdrop-blur-sm border border-gray-200/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Advanced Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overlap Setting */}
          <div className="flex items-center justify-between p-4 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Label
                htmlFor="considerOverlap"
                className="flex items-center text-sm font-medium"
              >
                Consider Overlap
                {renderTooltip(
                  "When enabled, overlapping defects will be treated as more severe"
                )}
              </Label>
            </div>
            <Switch
              id="considerOverlap"
              checked={config.ejection.advancedSettings.considerOverlap}
              onCheckedChange={(checked) =>
                updateConfig(
                  "ejection.advancedSettings.considerOverlap",
                  checked
                )
              }
              className="data-[state=checked]:bg-blue-600"
            />
          </div>

          {/* Region Controller */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Region of Interest & Exclusion Zones
                {renderTooltip(
                  "Define areas to analyze or exclude from analysis. Switch between modes to add different region types."
                )}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Use Draw mode to create regions, Move mode to adjust them.
              </p>
            </div>

            <ROIController
              regions={regions}
              onRegionsChange={handleRegionsChange}
              imageSrc={imageSrc}
              maxRegions={6} // 1 ROI + 5 exclusion zones
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedSettings;
