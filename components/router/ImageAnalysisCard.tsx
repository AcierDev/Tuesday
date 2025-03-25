"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Camera,
  ZoomIn,
  Download,
  Share,
  CircleEllipsis,
  CheckCircle,
  CircleX,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  historicalImages?: {
    url: string;
    metadata: ImageMetadata;
    timestamp: Date;
    analysis?: any;
    ejectionDecision?: boolean | null;
  }[];
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
  historicalImages = [],
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hoverEffect, setHoverEffect] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);

  // console.log("Analysis:", analysis);

  const handleDownload = useCallback(
    async (type: "original" | "annotated" | "both" = "original") => {
      if (!imageUrl) return;

      try {
        // For original image, use the existing method
        if (type === "original") {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `original-${new Date().toISOString()}.jpg`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          return;
        }

        // For annotated image or both, we need to render to canvas
        const img = new Image();
        const canvas = downloadCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Create a promise to handle image loading
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            // Set canvas size to match image
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw the original image
            ctx.drawImage(img, 0, 0);

            // Draw annotations if requested
            if (type === "annotated" || type === "both") {
              if (analysis?.data?.predictions) {
                // Draw all prediction boxes
                analysis.data.predictions.forEach((prediction: Prediction) => {
                  const x1 = prediction.bbox[0] * img.width;
                  const y1 = prediction.bbox[1] * img.height;
                  const x2 = prediction.bbox[2] * img.width;
                  const y2 = prediction.bbox[3] * img.height;
                  const width = x2 - x1;
                  const height = y2 - y1;

                  // Determine color based on class
                  let strokeColor, fillColor;
                  switch (prediction.class_name) {
                    case "crack":
                      strokeColor = "rgba(239, 68, 68, 1)"; // red-500
                      fillColor = "rgba(239, 68, 68, 0.2)";
                      break;
                    case "damage":
                      strokeColor = "rgba(249, 115, 22, 1)"; // orange-500
                      fillColor = "rgba(249, 115, 22, 0.2)";
                      break;
                    case "edge":
                      strokeColor = "rgba(59, 130, 246, 1)"; // blue-500
                      fillColor = "rgba(59, 130, 246, 0.2)";
                      break;
                    case "corner":
                      strokeColor = "rgba(34, 197, 94, 1)"; // green-500
                      fillColor = "rgba(34, 197, 94, 0.2)";
                      break;
                    case "knot":
                      strokeColor = "rgba(234, 179, 8, 1)"; // yellow-500
                      fillColor = "rgba(234, 179, 8, 0.2)";
                      break;
                    default:
                      strokeColor = "rgba(107, 114, 128, 1)"; // gray-500
                      fillColor = "rgba(107, 114, 128, 0.2)";
                  }

                  // Draw the box
                  ctx.strokeStyle = strokeColor;
                  ctx.fillStyle = fillColor;
                  ctx.lineWidth = 3;
                  ctx.fillRect(x1, y1, width, height);
                  ctx.strokeRect(x1, y1, width, height);

                  // Draw the label
                  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                  ctx.fillRect(x1, y1, 120, 24);
                  ctx.font = "bold 16px sans-serif";
                  ctx.fillStyle = "white";
                  ctx.fillText(
                    `${prediction.class_name} ${Math.round(
                      prediction.confidence * 100
                    )}%`,
                    x1 + 5,
                    y1 + 16
                  );
                });
              }

              // Draw pass/fail indicator
              if (ejectionDecision !== null) {
                const indicatorSize = Math.min(img.width, img.height) * 0.2; // 20% of the smaller dimension
                const x = img.width - indicatorSize - 20;
                const y = 20;

                if (ejectionDecision) {
                  // Fail indicator
                  ctx.fillStyle = "rgba(239, 68, 68, 0.2)"; // red-500 with 20% opacity
                  ctx.strokeStyle = "rgba(239, 68, 68, 1)"; // red-500
                } else {
                  // Pass indicator
                  ctx.fillStyle = "rgba(34, 197, 94, 0.2)"; // green-500 with 20% opacity
                  ctx.strokeStyle = "rgba(34, 197, 94, 1)"; // green-500
                }

                // Draw circle
                ctx.beginPath();
                ctx.arc(
                  x + indicatorSize / 2,
                  y + indicatorSize / 2,
                  indicatorSize / 2,
                  0,
                  2 * Math.PI
                );
                ctx.fill();
                ctx.lineWidth = 4;
                ctx.stroke();

                // Draw text
                ctx.font = "bold 24px sans-serif";
                ctx.fillStyle = ejectionDecision
                  ? "rgba(239, 68, 68, 1)"
                  : "rgba(34, 197, 94, 1)";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(
                  ejectionDecision ? "FAIL" : "PASS",
                  x + indicatorSize / 2,
                  y + indicatorSize / 2
                );
              }
            }

            resolve();
          };

          img.onerror = () => {
            reject(new Error("Failed to load image"));
          };

          // Set the image source to load it
          img.src = imageUrl || "";
        });

        // Convert canvas to blob and download
        canvas.toBlob((blob) => {
          if (!blob) return;

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${
            type === "annotated" ? "annotated" : "analysis"
          }-${new Date().toISOString()}.png`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, "image/png");
      } catch (error) {
        console.error("Failed to download image:", error);
      }
    },
    [imageUrl, analysis, ejectionDecision]
  );

  const handleDownloadAll = useCallback(async () => {
    if (!historicalImages || historicalImages.length === 0) return;

    // Create a zip file containing all images
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    // Add each image to the zip
    const imagePromises = historicalImages.map(async (img, index) => {
      try {
        const response = await fetch(img.url);
        const blob = await response.blob();
        const timestamp = new Date(img.timestamp).toISOString();
        zip.file(`image-${timestamp}.jpg`, blob);
      } catch (error) {
        console.error(`Failed to download image ${index}:`, error);
      }
    });

    // Wait for all images to be added to the zip
    await Promise.all(imagePromises);

    // Generate and download the zip file
    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `router-images-${new Date().toISOString()}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, [historicalImages]);

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

  const imageSrc = getImageSrc(imageUrl);

  // Determine the title of the card based on state
  const getCardTitle = () => {
    if (isCapturing) return "Capturing Image...";
    if (isAnalyzing) return "Analyzing...";

    if (ejectionDecision !== null) {
      return ejectionDecision ? "Defect Detected" : "No Defects Detected";
    }

    return "Router Image";
  };

  // Get a color for the badge based on the ejection decision
  const getStatusColor = () => {
    if (ejectionDecision === true) return "text-red-500";
    if (ejectionDecision === false) return "text-green-500";
    return "text-gray-500";
  };

  // Get a badge class based on status
  const getBadgeClass = () => {
    if (isCapturing)
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    if (isAnalyzing)
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";

    if (ejectionDecision === true) {
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    }
    if (ejectionDecision === false) {
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    }

    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  // Calculate the actual position for bounding boxes based on the image's display size
  const calculateOverlayPosition = useCallback(
    (bbox: number[]) => {
      if (imageSize.width === 0 || containerSize.width === 0) {
        return {
          left: `${(bbox[0] ?? 0) * 100}%`,
          top: `${(bbox[1] ?? 0) * 100}%`,
          width: `${((bbox[2] ?? 0) - (bbox[0] ?? 0)) * 100}%`,
          height: `${((bbox[3] ?? 0) - (bbox[1] ?? 0)) * 100}%`,
        };
      }

      // Get the actual display dimensions of the image
      const imageRatio = imageSize.width / imageSize.height;
      const containerRatio = containerSize.width / containerSize.height;

      let displayWidth,
        displayHeight,
        offsetX = 0,
        offsetY = 0;

      if (imageRatio > containerRatio) {
        // Image is wider than container (horizontal bars)
        displayWidth = containerSize.width;
        displayHeight = containerSize.width / imageRatio;
        offsetY = (containerSize.height - displayHeight) / 2;
      } else {
        // Image is taller than container (vertical bars)
        displayHeight = containerSize.height;
        displayWidth = containerSize.height * imageRatio;
        offsetX = (containerSize.width - displayWidth) / 2;
      }

      // Calculate positions based on the actual image display size
      const left = offsetX + (bbox[0] || 0) * displayWidth;
      const top = offsetY + (bbox[1] || 0) * displayHeight;
      const width = ((bbox[2] || 0) - (bbox[0] || 0)) * displayWidth;
      const height = ((bbox[3] || 0) - (bbox[1] || 0)) * displayHeight;

      return {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      };
    },
    [imageSize, containerSize]
  );

  // Update container and image dimensions when the image loads
  const updateSizes = useCallback(() => {
    if (containerRef.current && imageRef.current) {
      setContainerSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });

      // Use natural dimensions for the original image size
      const img = imageRef.current;
      if (img.naturalWidth) {
        setImageSize({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      }
    }
  }, []);

  // Listen for window resize and update sizes
  useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(updateSizes);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateSizes]);

  return (
    <Card
      className="shadow-sm dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden transition-all duration-200"
      onMouseEnter={() => setHoverEffect(true)}
      onMouseLeave={() => setHoverEffect(false)}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium mb-1 flex items-center gap-2">
              <span>{getCardTitle()}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${getBadgeClass()}`}
              >
                {isCapturing
                  ? "Capturing"
                  : isAnalyzing
                  ? "Analyzing"
                  : ejectionDecision === true
                  ? "Ejected"
                  : ejectionDecision === false
                  ? "Passed"
                  : "Unknown"}
              </span>
            </CardTitle>
            <CardDescription className="text-xs">
              {imageMetadata?.timestamp
                ? new Date(imageMetadata.timestamp).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })
                : "No timestamp available"}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    onClick={() => setDialogOpen(true)}
                    disabled={!imageSrc}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View full size</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    onClick={() => setDialogOpen(true)}
                    disabled={!imageSrc}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download image</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {onShare && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                      onClick={onShare}
                    >
                      <Share className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share image</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div
          className={`relative rounded-lg overflow-hidden aspect-square md:aspect-[4/3] h-auto bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 transition-all duration-300 ${
            hoverEffect ? "shadow-md" : ""
          }`}
          ref={containerRef}
        >
          {imageSrc ? (
            <div className="relative w-full h-full">
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Analysis image"
                className="w-full h-full object-contain"
                onLoad={updateSizes}
              />

              {/* Decision animation overlay */}
              <AnimatePresence>
                {ejectionDecision === false && <PassAnimation />}
                {ejectionDecision === true && <FailAnimation />}
              </AnimatePresence>

              {/* Loading overlays */}
              {isCapturing && renderLoadingOverlay("capturing")}
              {isAnalyzing && renderLoadingOverlay("analyzing")}

              {/* Prediction Bounding Boxes */}
              {shouldShowPredictions &&
                analysis.data.predictions.map((prediction: Prediction) => {
                  // Fix for the linter error - access array items individually instead of destructuring
                  const x1 = prediction.bbox[0];
                  const y1 = prediction.bbox[1];
                  const x2 = prediction.bbox[2];
                  const y2 = prediction.bbox[3];

                  // Use the calculated position based on actual image display size
                  const position = calculateOverlayPosition([x1, y1, x2, y2]);

                  // Determine color based on class
                  const colorMap: Record<string, string> = {
                    crack: "border-red-500 bg-red-500/20",
                    damage: "border-orange-500 bg-orange-500/20",
                    edge: "border-blue-500 bg-blue-500/20",
                    corner: "border-green-500 bg-green-500/20",
                    knot: "border-yellow-500 bg-yellow-500/20",
                    router: "border-purple-500 bg-purple-500/20",
                    side: "border-indigo-500 bg-indigo-500/20",
                    tearout: "border-pink-500 bg-pink-500/20",
                  };
                  const colorClass =
                    colorMap[prediction.class_name] ||
                    "border-gray-500 bg-gray-500/20";

                  return (
                    <div
                      key={prediction.detection_id}
                      className={`absolute border-2 ${colorClass} rounded-sm flex items-start justify-start`}
                      style={{
                        ...position,
                        transition: "all 0.2s ease-in-out",
                      }}
                    >
                      <span className="text-xs font-bold bg-black/80 text-white px-1 py-0.5 rounded-sm m-1 whitespace-nowrap">
                        {prediction.class_name}{" "}
                        {Math.round(prediction.confidence * 100)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Camera className="h-10 w-10 opacity-50" />
              <p className="text-sm">No image available</p>
            </div>
          )}
        </div>

        {/* Analysis summary (only show if we have results and not loading) */}
        {!isCapturing && !isAnalyzing && analysis?.data?.predictions && (
          <motion.div
            className="mt-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <span>Analysis Summary</span>
              {analysis.data.predictions.length > 0 && (
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full">
                  {analysis.data.predictions.length} defect
                  {analysis.data.predictions.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-xs">
              {analysis.data.predictions.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Decision:</span>
                    <span
                      className={`font-medium px-2 py-0.5 rounded-full ${getBadgeClass()}`}
                    >
                      {ejectionDecision === true
                        ? "Eject"
                        : ejectionDecision === false
                        ? "Pass"
                        : "Pending"}
                    </span>
                  </div>

                  {/* Defect type counts */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-1">
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(
                        analysis.data.predictions.reduce(
                          (acc: any, prediction: Prediction) => {
                            acc[prediction.class_name] =
                              (acc[prediction.class_name] || 0) + 1;
                            return acc;
                          },
                          {}
                        )
                      ).map(([className, count]) => (
                        <div
                          key={className}
                          className="flex justify-between items-center bg-white dark:bg-gray-800 p-1.5 rounded border border-gray-100 dark:border-gray-700"
                        >
                          <span className="capitalize font-medium">
                            {className}:
                          </span>
                          <span className="bg-gray-100 dark:bg-gray-700 px-1.5 rounded-full">
                            {count as number}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p>No defects detected in this image.</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Add a hidden canvas for image download processing */}
        <canvas ref={downloadCanvasRef} style={{ display: "none" }} />

        {/* Bottom action bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-end gap-2 rounded-b-lg">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDialogOpen(true)}
                  className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 text-white"
                  disabled={!imageUrl}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View Full Size</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 text-white"
                      disabled={!imageUrl}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Download Options</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload("original")}>
                  Original Image
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("annotated")}>
                  With Annotations
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDownload("both")}>
                  Both (with Pass/Fail)
                </DropdownMenuItem>
                {historicalImages && historicalImages.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDownloadAll}>
                      <Download className="h-4 w-4 mr-2" />
                      Download All Original Images ({historicalImages.length})
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {onShare && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onShare}
                    className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 text-white"
                    disabled={!imageUrl}
                  >
                    <Share className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </CardContent>

      {/* Full-size image dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl w-[90vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getCardTitle()}
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${getBadgeClass()}`}
              >
                {isCapturing
                  ? "Capturing"
                  : isAnalyzing
                  ? "Analyzing"
                  : ejectionDecision === true
                  ? "Ejected"
                  : ejectionDecision === false
                  ? "Passed"
                  : "Unknown"}
              </span>
              {imageMetadata?.timestamp && (
                <span className="ml-auto font-normal text-sm text-gray-500">
                  {new Date(imageMetadata.timestamp).toLocaleString()}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div
            className="relative rounded-lg overflow-hidden aspect-[4/3] md:aspect-square h-auto"
            ref={containerRef}
          >
            {imageSrc ? (
              <div className="relative w-full h-full">
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Analysis image"
                  className="w-full h-full object-contain"
                  onLoad={updateSizes}
                />

                {/* Decision overlay */}
                <AnimatePresence>
                  {ejectionDecision === false && <PassAnimation />}
                  {ejectionDecision === true && <FailAnimation />}
                </AnimatePresence>

                {/* Prediction Bounding Boxes */}
                {shouldShowPredictions &&
                  analysis.data.predictions.map((prediction: Prediction) => {
                    // Fix for the linter error - access array items individually instead of destructuring
                    const x1 = prediction.bbox[0];
                    const y1 = prediction.bbox[1];
                    const x2 = prediction.bbox[2];
                    const y2 = prediction.bbox[3];

                    // Use the calculated position based on actual image display size
                    const position = calculateOverlayPosition([x1, y1, x2, y2]);

                    // Determine color based on class
                    const colorMap: Record<string, string> = {
                      crack: "border-red-500 bg-red-500/20",
                      damage: "border-orange-500 bg-orange-500/20",
                      edge: "border-blue-500 bg-blue-500/20",
                      corner: "border-green-500 bg-green-500/20",
                      knot: "border-yellow-500 bg-yellow-500/20",
                      router: "border-purple-500 bg-purple-500/20",
                      side: "border-indigo-500 bg-indigo-500/20",
                      tearout: "border-pink-500 bg-pink-500/20",
                    };
                    const colorClass =
                      colorMap[prediction.class_name] ||
                      "border-gray-500 bg-gray-500/20";

                    return (
                      <div
                        key={prediction.detection_id}
                        className={`absolute border-2 ${colorClass} rounded-sm flex items-start justify-start`}
                        style={{
                          ...position,
                        }}
                      >
                        <span className="text-xs font-bold bg-black/80 text-white px-1 py-0.5 rounded-sm m-1 whitespace-nowrap">
                          {prediction.class_name}{" "}
                          {Math.round(prediction.confidence * 100)}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p>No image available</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={!imageUrl}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload("original")}>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Original Image Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("annotated")}>
                  <CircleX className="h-4 w-4 mr-2 text-red-500" />
                  With Annotations
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDownload("both")}>
                  <Download className="h-4 w-4 mr-2 text-blue-500" />
                  Both (with Pass/Fail)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ImageAnalysisCard;
