import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Target,
  Undo,
  Info,
  Maximize2,
  MinusCircle,
  PlusCircle,
  RotateCcw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactCrop, { Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface Region {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "roi" | "exclusion";
}

interface ROIControllerProps {
  regions: Region[];
  onRegionsChange: (regions: Region[]) => void;
  imageSrc: string;
  aspectRatio?: number;
  maxRegions?: number;
}

const ROIController: React.FC<ROIControllerProps> = ({
  regions,
  onRegionsChange,
  imageSrc,
  aspectRatio,
  maxRegions = 5,
}) => {
  const [currentCrop, setCurrentCrop] = useState<Crop>();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [history, setHistory] = useState<Region[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [drawingRegionType, setDrawingRegionType] = useState<
    "roi" | "exclusion"
  >("roi");
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Enhanced history management
  const pushToHistory = useCallback(
    (newRegions: Region[]) => {
      setHistory((prev) => {
        const newHistory = [...prev.slice(0, historyIndex + 1), newRegions];
        if (newHistory.length > 10) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 9));
    },
    [historyIndex]
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      onRegionsChange(history[historyIndex - 1]);
    }
  }, [history, historyIndex, onRegionsChange]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      onRegionsChange(history[historyIndex + 1]);
    }
  }, [history, historyIndex, onRegionsChange]);

  // Enhanced crop handling
  const handleCropComplete = useCallback(
    (crop: Crop) => {
      if (!crop.width || !crop.height) return;

      if (regions.length >= maxRegions) {
        setError(`Maximum number of regions (${maxRegions}) reached`);
        setCurrentCrop(undefined);
        return;
      }

      const minSize = 5; // Minimum size in pixels
      if (crop.width < minSize || crop.height < minSize) {
        setError("Region too small. Please draw a larger area.");
        setCurrentCrop(undefined);
        return;
      }

      pushToHistory([...regions]);
      const newRegion: Region = {
        id: crypto.randomUUID(),
        x: crop.x,
        y: crop.y,
        width: crop.width,
        height: crop.height,
        type: drawingRegionType,
      };

      onRegionsChange([...regions, newRegion]);
      setSelectedRegion(newRegion.id);
      setCurrentCrop(undefined);
      setError(null);
    },
    [regions, maxRegions, drawingRegionType, onRegionsChange, pushToHistory]
  );

  const deleteSelectedRegion = useCallback(() => {
    if (selectedRegion) {
      pushToHistory([...regions]);
      const updatedRegions = regions.filter((r) => r.id !== selectedRegion);
      onRegionsChange(updatedRegions);
      setSelectedRegion(null);
    }
  }, [selectedRegion, regions, onRegionsChange, pushToHistory]);

  // Reset all regions
  const resetRegions = useCallback(() => {
    if (regions.length > 0) {
      pushToHistory([...regions]);
      onRegionsChange([]);
      setSelectedRegion(null);
    }
  }, [regions, onRegionsChange, pushToHistory]);

  // Handle image load errors
  const handleImageError = () => {
    setError("Failed to load image. Please check the image source.");
    setImageLoaded(false);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setError(null);

    if (imageRef.current) {
      const { width, height } = imageRef.current.getBoundingClientRect();
      setImageDimensions({ width, height });
    }
  };

  // Disable drawing if maximum regions reached
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    setDisabled(regions.length >= maxRegions);
  }, [regions, maxRegions]);

  return (
    <Card className="bg-gray-900/5 dark:bg-gray-800 backdrop-blur-sm shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Region Controller
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={undo}
                    disabled={historyIndex === 0}
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={redo}
                    disabled={historyIndex === history.length - 1}
                  >
                    <RotateCcw className="h-4 w-4 rotate-180" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetRegions}
                    disabled={regions.length === 0}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset all regions</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Select
            value={drawingRegionType}
            onValueChange={(value: "roi" | "exclusion") =>
              setDrawingRegionType(value)
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Region Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="roi">
                <div className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-green-500" />
                  ROI
                </div>
              </SelectItem>
              <SelectItem value="exclusion">
                <div className="flex items-center gap-2">
                  <MinusCircle className="h-4 w-4 text-red-500" />
                  Exclusion
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1 flex justify-end gap-2">
            {regions.map((region, index) => (
              <Badge
                key={region.id}
                variant={region.type === "roi" ? "default" : "destructive"}
                className={`cursor-pointer transition-all ${
                  region.id === selectedRegion
                    ? "ring-2 ring-blue-500 ring-offset-2"
                    : "hover:ring-1 hover:ring-gray-400"
                }`}
                onClick={() => setSelectedRegion(region.id)}
              >
                {region.type === "roi" ? "ROI" : "Exclusion"} {index + 1}
              </Badge>
            ))}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800/50">
          <ReactCrop
            crop={currentCrop}
            onChange={setCurrentCrop}
            onComplete={handleCropComplete}
            aspect={aspectRatio}
            disabled={disabled}
            className="max-w-full"
            locked={disabled}
            ruleOfThirds
          >
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                ref={imageRef}
                src={imageSrc}
                alt="ROI selection"
                className="max-w-full h-auto block"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
              {imageLoaded &&
                imageDimensions &&
                regions.map((region) => (
                  <div
                    key={region.id}
                    style={{
                      position: "absolute",
                      border: "2px solid",
                      borderColor:
                        region.id === selectedRegion
                          ? "blue"
                          : region.type === "roi"
                          ? "green"
                          : "red",
                      left: `${(region.x / 100) * imageDimensions.width}px`,
                      top: `${(region.y / 100) * imageDimensions.height}px`,
                      width: `${
                        (region.width / 100) * imageDimensions.width
                      }px`,
                      height: `${
                        (region.height / 100) * imageDimensions.height
                      }px`,
                      boxSizing: "border-box",
                      cursor: "pointer",
                      backgroundColor:
                        region.id === selectedRegion
                          ? "rgba(0, 0, 255, 0.1)"
                          : "transparent",
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering crop
                      setSelectedRegion(region.id);
                    }}
                  />
                ))}
            </div>
          </ReactCrop>

          {selectedRegion && (
            <Button
              variant="outline"
              size="sm"
              onClick={deleteSelectedRegion}
              className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Info className="h-4 w-4" />
            <span>Click and drag to draw a new {drawingRegionType} region</span>
          </div>
          <div className="flex items-center gap-1">
            <Maximize2 className="h-4 w-4" />
            <span>
              {maxRegions - regions.length} region
              {maxRegions - regions.length !== 1 ? "s" : ""} remaining
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ROIController;
