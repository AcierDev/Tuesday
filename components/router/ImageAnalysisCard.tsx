"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Camera, ZoomIn, Download, Share, CircleEllipsis } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { AnalysisResults, ImageMetadata, Prediction } from "@/typings/types";

interface ImageAnalysisCardProps {
  imageUrl: string | null;
  imageMetadata: ImageMetadata | null;
  analysis?: AnalysisResults;
  isCapturing?: boolean;
  onRetry?: () => void;
  onShare?: () => void;
}

const ImageOverlay: React.FC<{
  imageUrl: string;
  predictions: Prediction[];
  onClick?: () => void;
  isDialog?: boolean;
}> = ({ imageUrl, predictions, onClick, isDialog = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isHovering, setIsHovering] = useState<string | null>(null);

  const updateCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const image = imageRef.current;

    if (!canvas || !container || !image) return;

    // For 1:1 aspect ratio, we can use the container's width
    const size = container.clientWidth;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    predictions.forEach((prediction) => {
      const { bbox, confidence, class_name, detection_id } = prediction;
      const isHighlighted = isHovering === detection_id;

      // For 1:1 images, we can directly map the bbox coordinates to canvas size
      const x = bbox.x1 * size;
      const y = bbox.y1 * size;
      const width = (bbox.x2 - bbox.x1) * size;
      const height = (bbox.y2 - bbox.y1) * size;

      // Draw box
      ctx.beginPath();
      ctx.strokeStyle = "rgba(34, 197, 94, 0.8)";
      ctx.lineWidth = isDialog
        ? isHighlighted
          ? 3
          : 2
        : isHighlighted
        ? 2
        : 1;
      ctx.strokeRect(x, y, width, height);

      // Label
      const label = `${class_name} ${(confidence * 100).toFixed(1)}%`;
      const fontSize = isDialog ? 16 : 14;
      ctx.font = `${fontSize}px system-ui`;
      const labelMetrics = ctx.measureText(label);
      const labelHeight = fontSize + 8;

      // Ensure label stays within canvas bounds
      let labelX = x;
      let labelY = y - 5;
      if (y - labelHeight < 0) {
        labelY = y + height + labelHeight - 5;
      }
      if (x + labelMetrics.width + 10 > size) {
        labelX = size - labelMetrics.width - 10;
      }

      // Semi-transparent background for label
      ctx.fillStyle = isHighlighted
        ? "rgba(0, 0, 0, 0.85)"
        : "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(
        labelX,
        labelY - labelHeight + 5,
        labelMetrics.width + 10,
        labelHeight
      );

      // Label text
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, labelX + 5, labelY);
    });
  }, [predictions, isHovering, isDialog]);

  useEffect(() => {
    const handleResize = () => requestAnimationFrame(updateCanvas);
    globalThis.addEventListener("resize", handleResize);
    return () => globalThis.removeEventListener("resize", handleResize);
  }, [updateCanvas]);

  useEffect(() => {
    const image = imageRef.current;
    if (image) {
      if (image.complete) {
        updateCanvas();
      } else {
        image.onload = updateCanvas;
      }
    }
  }, [imageUrl, updateCanvas]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-square ${
        onClick ? "cursor-zoom-in" : ""
      }`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Analysis capture with detected objects"
        className="w-full h-full object-cover rounded-lg"
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />
      {isDialog && predictions.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex flex-wrap gap-2">
            {predictions.map((pred) => (
              <Button
                key={pred.detection_id}
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 transition-colors"
                onMouseEnter={() => setIsHovering(pred.detection_id)}
                onMouseLeave={() => setIsHovering(null)}
              >
                {pred.class_name} ({(pred.confidence * 100).toFixed(1)}%)
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ImageAnalysisCard: React.FC<ImageAnalysisCardProps> = ({
  imageUrl,
  imageMetadata,
  analysis,
  isCapturing = false,
  onRetry,
  onShare,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analysis-${new Date().toISOString()}.jpg`;
      document.body.appendChild(a);
      a.click();
      globalThis.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download image:", error);
    }
  }, [imageUrl]);

  const renderLoadingOverlay = (type: "capturing" | "analyzing") => (
    <div className="absolute inset-0 bg-black/50 rounded-lg flex flex-col items-center justify-center gap-4">
      <div className="text-white flex items-center gap-2">
        {type === "capturing" ? (
          <Camera className="animate-pulse" />
        ) : (
          <CircleEllipsis className="animate-spin" />
        )}
        <span>{type === "capturing" ? "Capturing..." : "Analyzing..."}</span>
      </div>
      <Progress value={45} className="w-1/2" />
    </div>
  );

  return (
    <TooltipProvider>
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-gray-900 dark:text-gray-50">
                Latest Capture
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                {imageMetadata && (
                  <>
                    <div>
                      Captured:{" "}
                      {new Date(imageMetadata.timestamp).toLocaleTimeString()}
                    </div>
                  </>
                )}
                {analysis?.predictions && (
                  <div className="mt-1 flex items-center gap-2">
                    <span>Defects found: {analysis.predictions.length}</span>
                    {analysis.processingTime && (
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                        {analysis.processingTime.toFixed(2)}ms
                      </span>
                    )}
                  </div>
                )}
              </CardDescription>
            </div>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={isCapturing}
              >
                Retry
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg border dark:border-gray-700">
            {imageUrl ? (
              <ImageOverlay
                imageUrl={imageUrl}
                predictions={analysis?.predictions || []}
                onClick={() => setDialogOpen(true)}
              />
            ) : (
              <div className="aspect-square flex items-center justify-center text-gray-400 dark:text-gray-500">
                No image captured
              </div>
            )}
            {isCapturing && renderLoadingOverlay("capturing")}
            {imageUrl &&
              !analysis &&
              !isCapturing &&
              renderLoadingOverlay("analyzing")}
          </div>
        </CardContent>

        {imageUrl && (
          <CardFooter className="flex justify-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDialogOpen(true)}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View full size</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download image</TooltipContent>
            </Tooltip>

            {onShare && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={onShare}>
                    <Share className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share analysis</TooltipContent>
              </Tooltip>
            )}
          </CardFooter>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden dark:bg-gray-800">
          <DialogHeader className="p-6 pb-3">
            <DialogTitle>Detailed Analysis</DialogTitle>
          </DialogHeader>

          <div className="relative flex-shrink-0">
            <div className="w-full aspect-square">
              {imageUrl && (
                <ImageOverlay
                  imageUrl={imageUrl}
                  predictions={analysis?.predictions || []}
                  isDialog={true}
                />
              )}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 p-6 pt-3 border-t">
            {analysis && (
              <>
                <div className="text-sm text-gray-500 mb-4">
                  {`Analyzed at ${new Date(
                    analysis.timestamp
                  ).toLocaleString()}`}
                  {analysis.processingTime &&
                    ` • Processing time: ${analysis.processingTime.toFixed(
                      2
                    )}ms`}
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default ImageAnalysisCard;
