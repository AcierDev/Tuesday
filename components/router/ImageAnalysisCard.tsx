"use client";

import React, { useState, useCallback } from "react";
import { Camera, ZoomIn, Download, Share, CircleEllipsis } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  isAnalyzing?: boolean;
  onRetry?: () => void;
  onShare?: () => void;
}

const ImageAnalysisCard: React.FC<ImageAnalysisCardProps> = ({
  imageUrl,
  imageMetadata,
  analysis,
  isCapturing = false,
  isAnalyzing = false,
  onRetry,
  onShare,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analysis-${new Date().toISOString()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
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

  const getImageSrc = useCallback((url: string | null) => {
    if (!url) return null;
    if (url.startsWith("data:image/")) {
      return url;
    }
    if (url.startsWith("/9j/") || url.startsWith("iVBOR")) {
      return `data:image/jpeg;base64,${url}`;
    }
    return url;
  }, []);

  return (
    <TooltipProvider>
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-500" />
                Latest Capture
              </CardTitle>
              <CardDescription>
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
            <div className="flex items-center gap-2">
              {imageUrl && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDialogOpen(true)}
                        className="dark:bg-gray-700 dark:hover:bg-gray-600"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View full size</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleDownload}
                        className="dark:bg-gray-700 dark:hover:bg-gray-600"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download image</TooltipContent>
                  </Tooltip>

                  {onShare && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={onShare}
                          className="dark:bg-gray-700 dark:hover:bg-gray-600"
                        >
                          <Share className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Share analysis</TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  disabled={isCapturing}
                  className="dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg border dark:border-gray-700">
            {imageUrl ? (
              <div
                className="relative aspect-square cursor-zoom-in"
                onClick={() => setDialogOpen(true)}
              >
                <img
                  src={getImageSrc(imageUrl) || ""}
                  alt="Analysis capture"
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    console.error("Failed to load image:", e);
                  }}
                />
                {analysis?.predictions && analysis.predictions.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none">
                    {analysis.predictions.map((pred: Prediction, index) => (
                      <div
                        key={index}
                        className="absolute border-2 border-red-500 bg-red-500/10"
                        style={{
                          left: `${pred.bbox.x1 * 100}%`,
                          top: `${pred.bbox.y1 * 100}%`,
                          width: `${(pred.bbox.x2 - pred.bbox.x1) * 100}%`,
                          height: `${(pred.bbox.y2 - pred.bbox.y1) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-square flex items-center justify-center text-gray-400 dark:text-gray-500">
                No image captured
              </div>
            )}
            {isCapturing && renderLoadingOverlay("capturing")}
            {imageUrl && isAnalyzing && renderLoadingOverlay("analyzing")}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-3">
            <DialogTitle>Detailed Analysis</DialogTitle>
          </DialogHeader>

          {imageUrl && (
            <div className="relative">
              <img
                src={imageUrl}
                alt="Full size analysis"
                className="w-full h-auto"
              />
              {analysis?.predictions && analysis.predictions.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {analysis.predictions.map((pred: Prediction, index) => (
                    <div
                      key={index}
                      className="absolute border-2 border-red-500 bg-red-500/10"
                      style={{
                        left: `${pred.bbox.x1 * 100}%`,
                        top: `${pred.bbox.y1 * 100}%`,
                        width: `${(pred.bbox.x2 - pred.bbox.x1) * 100}%`,
                        height: `${(pred.bbox.y2 - pred.bbox.y1) * 100}%`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default ImageAnalysisCard;
