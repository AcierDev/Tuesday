import React, { useEffect, useCallback, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ImageMetadata } from "@/typings/types";
import { Separator } from "@/components/ui/separator";
import {
  CircleCheck,
  CircleX,
  AlertTriangle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Info,
  ArrowRight,
  RotateCw,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface EjectionInsightsProps {
  state: any;
  currentImage: {
    url: string | null;
    metadata: ImageMetadata | null;
  };
  historicalImages?: {
    url: string;
    metadata: ImageMetadata;
    timestamp: Date;
    analysis?: any;
    ejectionDecision?: boolean | null;
  }[];
}

const EjectionInsights: React.FC<EjectionInsightsProps> = ({
  state,
  currentImage,
  historicalImages = [],
}) => {
  // Debug logging to help diagnose missing data
  useEffect(() => {
    console.log("EjectionInsights state:", state);
    console.log("EjectionInsights currentAnalysis:", state.currentAnalysis);
    console.log("EjectionInsights ejectionDecision:", state.ejectionDecision);
  }, [state]);

  // Get the current analysis results
  const currentAnalysis = state.currentAnalysis;
  const ejectionDecision = state.ejectionDecision;

  // Safely access nested properties
  const safelyAccessPredictions = () => {
    try {
      // First check currentAnalysis.data.predictions
      if (
        currentAnalysis?.data?.predictions &&
        Array.isArray(currentAnalysis.data.predictions)
      ) {
        return currentAnalysis.data.predictions;
      }

      // Then check currentAnalysis.predictions
      if (
        currentAnalysis?.predictions &&
        Array.isArray(currentAnalysis.predictions)
      ) {
        return currentAnalysis.predictions;
      }

      // If we reach here, no valid predictions were found
      return [];
    } catch (err) {
      console.error("Error accessing predictions:", err);
      return [];
    }
  };

  // Get predictions using the safe accessor
  const predictions = safelyAccessPredictions();

  // Safely access ejection reasons
  const safelyAccessEjectionReasons = () => {
    try {
      if (
        currentAnalysis?.shouldEjectResult?.reasons &&
        Array.isArray(currentAnalysis.shouldEjectResult.reasons)
      ) {
        return currentAnalysis.shouldEjectResult.reasons;
      }

      if (
        currentAnalysis?.ejectionReasons &&
        Array.isArray(currentAnalysis.ejectionReasons)
      ) {
        return currentAnalysis.ejectionReasons;
      }

      return [];
    } catch (err) {
      console.error("Error accessing ejection reasons:", err);
      return [];
    }
  };

  // Get ejection reasons using the safe accessor
  const ejectionReasons = safelyAccessEjectionReasons();

  // Add detailed debug info to console
  useEffect(() => {
    if (currentAnalysis) {
      console.log("Analysis structure:", Object.keys(currentAnalysis));
      if (currentAnalysis.data) {
        console.log("Analysis data:", Object.keys(currentAnalysis.data));
        if (currentAnalysis.data.predictions) {
          console.log(
            "Predictions count:",
            currentAnalysis.data.predictions.length
          );
        }
      }
    }
  }, [currentAnalysis]);

  // Get global confidence threshold from settings (if available)
  const globalConfidenceThreshold =
    state.settings?.ejection?.globalSettings?.globalConfidenceThreshold || 0.5;

  // Helper function to get color based on confidence
  const getConfidenceColor = (confidence: number) => {
    if (confidence < 0.5) return "text-red-500";
    if (confidence < 0.7) return "text-amber-500";
    return "text-green-500";
  };

  // Helper function to explain confidence level in human terms
  const explainConfidence = (confidence: number) => {
    if (confidence < 0.3) return "Very Low";
    if (confidence < 0.5) return "Low";
    if (confidence < 0.7) return "Moderate";
    if (confidence < 0.85) return "High";
    return "Very High";
  };

  // Function to capture current state and analysis to console
  const captureDebugInfo = useCallback(() => {
    console.group("EjectionInsights Debug Info");
    console.log("Current State:", state);
    console.log("Current Analysis:", currentAnalysis);
    console.log("Ejection Decision:", ejectionDecision);
    console.log("Predictions:", predictions);
    console.log("Ejection Reasons:", ejectionReasons);
    console.groupEnd();
  }, [state, currentAnalysis, ejectionDecision, predictions, ejectionReasons]);

  // Call the debug function when the state changes
  useEffect(() => {
    captureDebugInfo();
  }, [captureDebugInfo]);

  // Add local state to force re-renders
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Decision Explanation */}
      <div className="space-y-6">
        {/* Main Decision Card */}
        <Card className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Ejection Decision
            </CardTitle>
            <CardDescription>
              Analysis and explanation of the current ejection decision
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!currentImage.url ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Info className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  No image analysis available.
                  <br />
                  Waiting for the next detection...
                </p>
              </div>
            ) : ejectionDecision === null ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Info className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  Analysis in progress...
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center mb-6">
                  {ejectionDecision ? (
                    <div className="flex flex-col items-center">
                      <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
                        <ShieldAlert className="h-12 w-12 text-red-500" />
                      </div>
                      <span className="font-medium text-lg mt-2 text-red-600 dark:text-red-400">
                        Ejection Required
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                        <ShieldCheck className="h-12 w-12 text-green-500" />
                      </div>
                      <span className="font-medium text-lg mt-2 text-green-600 dark:text-green-400">
                        No Ejection Needed
                      </span>
                    </div>
                  )}
                </div>

                <h3 className="text-sm font-semibold mb-2">
                  Decision Factors:
                </h3>
                <div className="space-y-3 mb-6">
                  {ejectionReasons.length > 0 ? (
                    ejectionReasons.map((reason: string, index: number) => (
                      <div
                        key={index}
                        className={`p-3 rounded-md flex items-start gap-2 ${
                          ejectionDecision
                            ? "bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30"
                            : "bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30"
                        }`}
                      >
                        {ejectionDecision ? (
                          <CircleX className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <CircleCheck className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        )}
                        <span className="text-sm">{reason}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-md flex items-start gap-2 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30">
                      <CircleCheck className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">
                        {ejectionDecision
                          ? "Ejection decision made without specific reasons provided"
                          : "No defects detected above threshold"}
                      </span>
                    </div>
                  )}
                </div>

                {currentAnalysis?.timing && (
                  <div className="space-y-2 mt-4">
                    <h3 className="text-sm font-semibold">
                      Decision Performance:
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-gray-500">
                          Total Decision Time:
                        </span>
                        <span className="font-medium">
                          {currentAnalysis.timing.totalTime}ms
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500">Validation Time:</span>
                        <span className="font-medium">
                          {currentAnalysis.timing.validation}ms
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500">Filtering Time:</span>
                        <span className="font-medium">
                          {currentAnalysis.timing.filtering}ms
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500">
                          Global Criteria Check:
                        </span>
                        <span className="font-medium">
                          {currentAnalysis.timing.globalCriteria}ms
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Settings Impact Card */}
        <Card className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Settings Impact</CardTitle>
            <CardDescription>
              How current settings affect ejection decisions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">
                    Global Confidence Threshold
                  </span>
                  <span className="text-sm font-medium">
                    {globalConfidenceThreshold * 100}%
                  </span>
                </div>
                <Progress
                  value={globalConfidenceThreshold * 100}
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Detections with confidence below this threshold are ignored
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Ejection Status</h4>
                <div className="flex items-center gap-2">
                  {state.settings?.ejection?.globalSettings?.ejectionEnabled ? (
                    <>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30"
                      >
                        Enabled
                      </Badge>
                      <span className="text-xs text-gray-500">
                        System will eject items when criteria are met
                      </span>
                    </>
                  ) : (
                    <>
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30"
                      >
                        Disabled
                      </Badge>
                      <span className="text-xs text-gray-500">
                        System will analyze but not eject any items
                      </span>
                    </>
                  )}
                </div>
              </div>

              {state.settings?.ejection?.globalSettings && (
                <>
                  <Separator />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Additional Criteria</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Maximum defects before ejection:
                        </span>
                        <span className="text-xs font-medium">
                          {
                            state.settings.ejection.globalSettings
                              .maxDefectsBeforeEject
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Require multiple defects:
                        </span>
                        <span className="text-xs font-medium">
                          {state.settings.ejection.globalSettings
                            .requireMultipleDefects
                            ? "Yes"
                            : "No"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Minimum total area (px²):
                        </span>
                        <span className="text-xs font-medium">
                          {state.settings.ejection.globalSettings.minTotalArea}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Predictions Breakdown */}
      <div className="space-y-6">
        {/* Image and Predictions Card */}
        <Card className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-card">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Defect Analysis
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  captureDebugInfo();
                  // Force a re-render by updating local state
                  setLocalRefreshKey((prev) => prev + 1);
                }}
              >
                <RotateCw className="h-4 w-4" />
                <span className="sr-only">Refresh</span>
              </Button>
            </div>
            <CardDescription>
              Detailed analysis of detected defects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!currentImage.url ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Info className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  No image available.
                </p>
              </div>
            ) : (
              <>
                {/* Current Image */}
                <div className="rounded-md overflow-hidden mb-4 relative">
                  <img
                    src={currentImage.url}
                    alt="Current Analysis"
                    className="w-full h-auto object-contain"
                  />

                  {/* Bounding Boxes */}
                  {predictions.length > 0 && currentImage.url && (
                    <div className="absolute inset-0">
                      {predictions.map((prediction: any, idx: number) => {
                        const isAboveThreshold =
                          prediction.confidence >= globalConfidenceThreshold;
                        const [x1, y1, x2, y2] = prediction.bbox;

                        // Calculate percentage values for positioning
                        const left = `${x1 * 100}%`;
                        const top = `${y1 * 100}%`;
                        const width = `${(x2 - x1) * 100}%`;
                        const height = `${(y2 - y1) * 100}%`;

                        // Determine color based on threshold and class
                        let boxColor = "border-yellow-400";
                        let bgColor = "bg-yellow-400/20";

                        if (!isAboveThreshold) {
                          boxColor = "border-gray-400";
                          bgColor = "bg-gray-400/10";
                        } else if (
                          prediction.class_name === "damage" ||
                          prediction.class_name === "crack"
                        ) {
                          boxColor = "border-red-500";
                          bgColor = "bg-red-500/20";
                        } else if (prediction.class_name === "knot") {
                          boxColor = "border-blue-500";
                          bgColor = "bg-blue-500/20";
                        }

                        return (
                          <div
                            key={`box-${idx}`}
                            className={`absolute border-2 ${boxColor} ${bgColor}`}
                            style={{
                              left,
                              top,
                              width,
                              height,
                              pointerEvents: "none",
                            }}
                          >
                            <div
                              className={`absolute -top-6 -left-1 px-1 py-0.5 text-xs font-bold ${boxColor.replace(
                                "border-",
                                "bg-"
                              )} text-white rounded`}
                            >
                              {prediction.class_name} (
                              {(prediction.confidence * 100).toFixed(0)}%)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Debug info - only show in development */}
                {process.env.NODE_ENV === "development" && (
                  <div className="mb-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-md">
                    <h4 className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                      Debug Info
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-yellow-700 dark:text-yellow-400">
                          Predictions Count:
                        </span>
                        <span className="ml-1 font-mono">
                          {predictions.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-yellow-700 dark:text-yellow-400">
                          Ejection Decision:
                        </span>
                        <span className="ml-1 font-mono">
                          {ejectionDecision === null
                            ? "null"
                            : ejectionDecision
                            ? "true"
                            : "false"}
                        </span>
                      </div>
                      <div>
                        <span className="text-yellow-700 dark:text-yellow-400">
                          Analysis Structure:
                        </span>
                        <span className="ml-1 font-mono">
                          {currentAnalysis
                            ? Object.keys(currentAnalysis).join(", ")
                            : "null"}
                        </span>
                      </div>
                      <div>
                        <span className="text-yellow-700 dark:text-yellow-400">
                          Reasons:
                        </span>
                        <span className="ml-1 font-mono">
                          {ejectionReasons.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-yellow-700 dark:text-yellow-400">
                          Data Path:
                        </span>
                        <span className="ml-1 font-mono">
                          {currentAnalysis?.data?.predictions
                            ? "currentAnalysis.data.predictions"
                            : currentAnalysis?.predictions
                            ? "currentAnalysis.predictions"
                            : "none"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-yellow-700 dark:text-yellow-400">
                          First Prediction:
                        </span>
                        <span className="ml-1 font-mono">
                          {predictions.length > 0
                            ? predictions[0].class_name || "unknown"
                            : "none"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-yellow-700 dark:text-yellow-400">
                          ID Type:
                        </span>
                        <span className="ml-1 font-mono">
                          {predictions.length > 0
                            ? `${typeof predictions[0].detection_id} (${
                                predictions[0].detection_id
                              })`
                            : "n/a"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* User-friendly explanation of defect detection */}
                {predictions.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-md">
                    <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
                      Detection Summary
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      {predictions.length === 1
                        ? "1 defect was detected in this image."
                        : `${predictions.length} defects were detected in this image.`}{" "}
                      {predictions.filter(
                        (p) => p.confidence >= globalConfidenceThreshold
                      ).length === 0
                        ? "None met the confidence threshold for ejection."
                        : ejectionDecision
                        ? "The system determined the defects were significant enough to require ejection."
                        : "The defects were not significant enough to require ejection."}
                    </p>
                  </div>
                )}

                <h3 className="text-sm font-semibold mb-2">
                  Detected Defects ({predictions.length}):
                </h3>
                <ScrollArea className="h-[300px] pr-4">
                  {predictions.length > 0 ? (
                    <div className="space-y-3">
                      {predictions.map((prediction: any, index: number) => {
                        const isAboveThreshold =
                          prediction.confidence >= globalConfidenceThreshold;
                        return (
                          <div
                            key={index}
                            className={`p-3 rounded-md border ${
                              isAboveThreshold
                                ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30"
                                >
                                  {prediction.class_name}
                                </Badge>
                                {!isAboveThreshold && (
                                  <Badge
                                    variant="outline"
                                    className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                                  >
                                    Ignored
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs font-mono">
                                ID:{" "}
                                {typeof prediction.detection_id === "string"
                                  ? prediction.detection_id.substring(0, 8)
                                  : prediction.detection_id
                                      ?.toString?.()
                                      .substring(0, 8) || "unknown"}
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs">Confidence:</span>
                                  <span
                                    className={`text-xs font-medium ${getConfidenceColor(
                                      prediction.confidence
                                    )}`}
                                  >
                                    {(prediction.confidence * 100).toFixed(1)}%
                                    ({explainConfidence(prediction.confidence)})
                                  </span>
                                </div>
                                <div className="relative pt-1">
                                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                                    <div
                                      style={{
                                        width: `${
                                          prediction.confidence * 100
                                        }%`,
                                      }}
                                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                        prediction.confidence < 0.5
                                          ? "bg-red-500"
                                          : prediction.confidence < 0.7
                                          ? "bg-amber-500"
                                          : "bg-green-500"
                                      }`}
                                    ></div>
                                  </div>
                                  {/* Threshold indicator */}
                                  <div
                                    className="absolute top-1 bottom-0 w-0.5 bg-blue-600 dark:bg-blue-400"
                                    style={{
                                      left: `${
                                        globalConfidenceThreshold * 100
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">
                                    Position:
                                  </span>
                                  <span>
                                    x: {(prediction.bbox[0] * 100).toFixed(1)}%,
                                    y: {(prediction.bbox[1] * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Size:</span>
                                  <span>
                                    w:{" "}
                                    {(
                                      (prediction.bbox[2] -
                                        prediction.bbox[0]) *
                                      100
                                    ).toFixed(1)}
                                    %, h:{" "}
                                    {(
                                      (prediction.bbox[3] -
                                        prediction.bbox[1]) *
                                      100
                                    ).toFixed(1)}
                                    %
                                  </span>
                                </div>
                              </div>

                              {!isAboveThreshold && (
                                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mt-1 p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                                  <Info className="h-3.5 w-3.5" />
                                  <span>
                                    Below confidence threshold (
                                    {globalConfidenceThreshold * 100}%), not
                                    considered for ejection
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <CircleCheck className="h-10 w-10 text-green-500 mb-3" />
                      <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                        No defects detected in this image
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EjectionInsights;
