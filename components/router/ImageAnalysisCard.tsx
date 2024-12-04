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
import { motion, AnimatePresence } from "framer-motion";

interface ImageAnalysisCardProps {
  imageUrl: string | null;
  imageMetadata: ImageMetadata | null;
  analysis?: AnalysisResults;
  isCapturing?: boolean;
  isAnalyzing?: boolean;
  ejectionDecision: boolean | null;
  onRetry?: () => void;
  onShare?: () => void;
}

const PassAnimation = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 rounded-lg overflow-hidden"
  >
    {/* Radial gradient background with pulse */}
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: [0, 0.5, 0.2],
        scale: [0.8, 1.2, 1],
      }}
      transition={{
        duration: 1.5,
        ease: "easeOut",
        times: [0, 0.5, 1],
      }}
      className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20"
    />

    {/* Checkmark circle */}
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        damping: 15,
        stiffness: 200,
        delay: 0.2,
      }}
    >
      <div className="relative w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500">
        {/* Rotating outer ring */}
        <motion.div
          className="absolute inset-0 border-2 border-green-400 rounded-full"
          initial={{ opacity: 0, rotate: 0 }}
          animate={{
            opacity: [0, 1, 0],
            rotate: 360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            times: [0, 0.5, 1],
            repeat: Infinity,
          }}
        />

        {/* PASS text */}
        <motion.span
          className="text-2xl font-bold text-green-500"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.2 }}
        >
          PASS
        </motion.span>
      </div>
    </motion.div>
  </motion.div>
);

const FailAnimation = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 rounded-lg overflow-hidden"
  >
    {/* Alert background with pulse */}
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: [0, 0.5, 0.2],
        scale: [0.8, 1.2, 1],
      }}
      transition={{
        duration: 1.5,
        ease: "easeOut",
        times: [0, 0.5, 1],
      }}
      className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-rose-500/20"
    />

    {/* X mark circle */}
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        damping: 15,
        stiffness: 200,
        delay: 0.2,
      }}
    >
      <div className="relative w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500">
        {/* Pulsing outer ring */}
        <motion.div
          className="absolute inset-0 border-2 border-red-400 rounded-full"
          initial={{ opacity: 0, scale: 1 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 1.5,
            ease: "easeInOut",
            times: [0, 0.5, 1],
            repeat: Infinity,
          }}
        />

        {/* FAIL text */}
        <motion.span
          className="text-2xl font-bold text-red-500"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.2 }}
        >
          FAIL
        </motion.span>
      </div>
    </motion.div>

    {/* Warning stripes */}
    <div className="absolute inset-0 overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[200%] h-4 bg-red-500/10 -rotate-45"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.2,
          }}
          style={{
            top: `${i * 20}%`,
          }}
        />
      ))}
    </div>
  </motion.div>
);

const ImageAnalysisCard: React.FC<ImageAnalysisCardProps> = ({
  imageUrl,
  imageMetadata,
  analysis,
  isCapturing = false,
  isAnalyzing = false,
  ejectionDecision = null,
  onRetry,
  onShare,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  // console.log("Analysis:", analysis);

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

  // Only show predictions if we're not capturing/analyzing and have valid analysis results
  const shouldShowPredictions =
    !isCapturing &&
    !isAnalyzing &&
    analysis?.data?.predictions &&
    analysis.data.predictions.length > 0;

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
                {analysis?.data.predictions && (
                  <div className="mt-1 flex items-center gap-2">
                    <span>
                      Defects found: {analysis.data.predictions.length}
                    </span>
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
                <AnimatePresence>
                  {!isAnalyzing &&
                    !isCapturing &&
                    imageUrl &&
                    analysis &&
                    ejectionDecision !== null &&
                    (!ejectionDecision ? <PassAnimation /> : <FailAnimation />)}
                </AnimatePresence>
                {shouldShowPredictions && (
                  <div className="absolute inset-0 pointer-events-none">
                    {analysis.data.predictions.map(
                      (pred: Prediction, index) => (
                        <div
                          key={pred.detection_id}
                          className="absolute group"
                          style={{
                            left: `${pred.bbox[0] * 100}%`,
                            top: `${pred.bbox[1] * 100}%`,
                            width: `${(pred.bbox[2] - pred.bbox[0]) * 100}%`,
                            height: `${(pred.bbox[3] - pred.bbox[1]) * 100}%`,
                          }}
                        >
                          {/* Bounding box */}
                          <div className="absolute inset-0 border-2 border-red-500 bg-red-500/10" />

                          {/* Label */}
                          <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
                            {pred.class_name} (
                            {(pred.confidence * 100).toFixed(1)}%)
                          </div>

                          {/* Show full details on hover */}
                          <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-gray-900/90 text-white text-xs p-2 rounded shadow-lg whitespace-nowrap z-10">
                            <div>Class: {pred.class_name}</div>
                            <div>
                              Confidence: {(pred.confidence * 100).toFixed(1)}%
                            </div>
                            <div>
                              Area:{" "}
                              {(
                                (pred.bbox[2] - pred.bbox[0]) *
                                (pred.bbox[3] - pred.bbox[1]) *
                                100
                              ).toFixed(2)}
                              %
                            </div>
                          </div>
                        </div>
                      )
                    )}
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
                src={getImageSrc(imageUrl) || ""}
                alt="Full size analysis"
                className="w-full h-auto"
              />
              {shouldShowPredictions && (
                <div className="absolute inset-0 pointer-events-none">
                  {analysis.data.predictions.map((pred: Prediction, index) => (
                    <div
                      key={pred.detection_id}
                      className="absolute group"
                      style={{
                        left: `${pred.bbox[0] * 100}%`,
                        top: `${pred.bbox[1] * 100}%`,
                        width: `${(pred.bbox[2] - pred.bbox[0]) * 100}%`,
                        height: `${(pred.bbox[3] - pred.bbox[1]) * 100}%`,
                      }}
                    >
                      {/* Bounding box */}
                      <div className="absolute inset-0 border-2 border-red-500 bg-red-500/10" />

                      {/* Label */}
                      <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
                        {pred.class_name} ({(pred.confidence * 100).toFixed(1)}
                        %)
                      </div>

                      {/* Show full details on hover */}
                      <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-gray-900/90 text-white text-xs p-2 rounded shadow-lg whitespace-nowrap z-10">
                        <div>Class: {pred.class_name}</div>
                        <div>
                          Confidence: {(pred.confidence * 100).toFixed(1)}%
                        </div>
                        <div>
                          Area:{" "}
                          {(
                            (pred.bbox[2] - pred.bbox[0]) *
                            (pred.bbox[3] - pred.bbox[1]) *
                            100
                          ).toFixed(2)}
                          %
                        </div>
                      </div>
                    </div>
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
