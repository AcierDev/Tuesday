import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Undo } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EjectionSettings, RegionOfInterest } from "@/typings/types";

interface ROIControlProps {
  config: EjectionSettings;
  updateConfig: (path: string, value: any) => void;
}

interface Coordinates {
  x: number;
  y: number;
}

export const AdvancedSettings: React.FC<ROIControlProps> = ({
  config,
  updateConfig,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Coordinates>({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);

  const renderTooltip = (content: string) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 ml-1" />
        </TooltipTrigger>
        <TooltipContent>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 0.5;
    const gridSize = 20;

    // Draw vertical grid lines
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw ROI rectangle
    const roi = config.advancedSettings.regionOfInterest;
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(roi.x, roi.y, roi.width, roi.height);

    // Draw semi-transparent fill
    ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
    ctx.fillRect(roi.x, roi.y, roi.width, roi.height);

    // Draw resize handles
    const handleSize = 8;
    ctx.fillStyle = "#3b82f6";
    const handles = [
      { name: "nw", x: roi.x, y: roi.y },
      { name: "ne", x: roi.x + roi.width, y: roi.y },
      { name: "se", x: roi.x + roi.width, y: roi.y + roi.height },
      { name: "sw", x: roi.x, y: roi.y + roi.height },
    ];

    handles.forEach((handle) => {
      ctx.fillRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      );
    });

    // Draw dimensions
    ctx.font = "12px Inter";
    ctx.fillStyle = "#64748b";
    const dimensionsText = `${Math.round(roi.width)}x${Math.round(roi.height)}`;
    const textMetrics = ctx.measureText(dimensionsText);
    const textX = roi.x + (roi.width - textMetrics.width) / 2;
    const textY = roi.y + roi.height / 2;

    // Draw text background
    const padding = 4;
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillRect(
      textX - padding,
      textY - 12,
      textMetrics.width + padding * 2,
      16
    );

    // Draw text
    ctx.fillStyle = "#64748b";
    ctx.fillText(dimensionsText, textX, textY);
  }, [config.advancedSettings.regionOfInterest]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getResizeHandle = (x: number, y: number): string | null => {
    const handleSize = 8;
    const roi = config.advancedSettings.regionOfInterest;
    const handles = [
      { name: "nw", x: roi.x, y: roi.y },
      { name: "ne", x: roi.x + roi.width, y: roi.y },
      { name: "se", x: roi.x + roi.width, y: roi.y + roi.height },
      { name: "sw", x: roi.x, y: roi.y + roi.height },
    ];

    const clickedHandle = handles.find(
      (handle) =>
        Math.abs(handle.x - x) < handleSize &&
        Math.abs(handle.y - y) < handleSize
    );

    return clickedHandle?.name ?? null;
  };

  const isInsideROI = (x: number, y: number): boolean => {
    const roi = config.advancedSettings.regionOfInterest;
    return (
      x >= roi.x &&
      x <= roi.x + roi.width &&
      y >= roi.y &&
      y <= roi.y + roi.height
    );
  };

  const getCanvasCoordinates = (e: React.MouseEvent): Coordinates => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    const handle = getResizeHandle(coords.x, coords.y);

    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
    } else if (isInsideROI(coords.x, coords.y)) {
      setIsDragging(true);
    }

    setDragStart(coords);
  };

  const updateROI = useCallback(
    (newROI: RegionOfInterest) => {
      // Ensure ROI stays within canvas bounds
      const canvas = canvasRef.current;
      if (!canvas) return;

      const boundedROI = {
        x: Math.max(0, Math.min(canvas.width - newROI.width, newROI.x)),
        y: Math.max(0, Math.min(canvas.height - newROI.height, newROI.y)),
        width: Math.max(20, Math.min(canvas.width - newROI.x, newROI.width)),
        height: Math.max(20, Math.min(canvas.height - newROI.y, newROI.height)),
      };

      updateConfig("advancedSettings.regionOfInterest", boundedROI);
    },
    [updateConfig]
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || (!isDragging && !isResizing)) return;

    const coords = getCanvasCoordinates(e);
    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;
    const roi = config.advancedSettings.regionOfInterest;

    if (isResizing && resizeHandle) {
      let newROI = { ...roi };

      switch (resizeHandle) {
        case "nw":
          newROI = {
            x: roi.x + dx,
            y: roi.y + dy,
            width: roi.width - dx,
            height: roi.height - dy,
          };
          break;
        case "ne":
          newROI = {
            x: roi.x,
            y: roi.y + dy,
            width: roi.width + dx,
            height: roi.height - dy,
          };
          break;
        case "se":
          newROI = {
            x: roi.x,
            y: roi.y,
            width: roi.width + dx,
            height: roi.height + dy,
          };
          break;
        case "sw":
          newROI = {
            x: roi.x + dx,
            y: roi.y,
            width: roi.width - dx,
            height: roi.height + dy,
          };
          break;
      }

      updateROI(newROI);
    } else if (isDragging) {
      updateROI({
        ...roi,
        x: roi.x + dx,
        y: roi.y + dy,
      });
    }

    setDragStart(coords);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const handleReset = () => {
    updateConfig("advancedSettings.regionOfInterest", {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Label htmlFor="considerOverlap" className="flex items-center">
            Consider Overlap
            {renderTooltip(
              "When enabled, overlapping defects will be treated as more severe"
            )}
          </Label>
          <Switch
            id="considerOverlap"
            checked={config.advancedSettings.considerOverlap}
            onCheckedChange={(checked) =>
              updateConfig("advancedSettings.considerOverlap", checked)
            }
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center">
            Region of Interest
            {renderTooltip(
              "Define the specific area of the image to be analyzed for defects"
            )}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <Undo className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="space-y-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Drag to move, handles to resize
          </span>
          <div className="relative border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
            <canvas
              ref={canvasRef}
              width={300}
              height={200}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="touch-none select-none cursor-move"
              style={{
                width: "100%",
                height: "auto",
                maxWidth: "600px",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
