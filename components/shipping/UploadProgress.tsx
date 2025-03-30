import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useUploadProgressStore } from "@/stores/useUploadProgressStore";
import { UploadStep, TrackingInfo } from "@/types/shipping";

const formatTrackingInfo = (trackingInfo?: TrackingInfo) => {
  if (!trackingInfo) return null;
  return `${trackingInfo.carrier} - ${trackingInfo.trackingNumber}`;
};

export function UploadProgressToast() {
  const { files, completedFiles, removeFile } = useUploadProgressStore();
  // Filter out completed files from display
  const activeFiles = Object.values(files).filter(
    (progress) => !completedFiles.has(progress.file.name)
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 space-y-2">
      <AnimatePresence
        mode="wait"
        onExitComplete={() => {
          // Clean up completed files from the store after animation
          completedFiles.forEach((fileName) => removeFile(fileName));
        }}
      >
        {activeFiles.map((progress) => (
          <motion.div
            key={progress.file.name}
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border 
              border-gray-200 dark:border-gray-700 overflow-hidden`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    {progress.steps.every(
                      (step: UploadStep) => step.status === "complete"
                    ) ? (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    ) : progress.steps.some(
                        (step: UploadStep) => step.status === "error"
                      ) ? (
                      <XCircle className="w-5 h-5 text-destructive" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    )}
                  </div>
                  <h4 className="font-medium text-sm text-foreground">
                    {progress.file.name}
                  </h4>
                </div>
                <span className="text-xs font-medium text-primary">
                  {Math.round(progress.progress)}%
                </span>
              </div>

              <div className="relative h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <div className="mt-3 space-y-1.5">
                {progress.steps.map((step: UploadStep) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center space-x-2"
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      {step.status === "complete" && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200 }}
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </motion.div>
                      )}
                      {step.status === "processing" && (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      )}
                      {step.status === "error" && (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs ${
                          step.status === "processing"
                            ? "text-primary font-medium"
                            : step.status === "complete"
                            ? "text-muted-foreground"
                            : step.status === "error"
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.message && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="text-xs text-muted-foreground mt-0.5 truncate"
                        >
                          {step.message}
                        </motion.p>
                      )}
                      {step.id === "extraction" && progress.trackingInfo && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-1 text-xs"
                        >
                          <div className="flex items-center space-x-1 text-primary">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                            <span className="text-[10px] truncate">
                              {formatTrackingInfo(progress.trackingInfo)}
                              {progress.trackingInfo.sender &&
                                ` | From: ${progress.trackingInfo.sender}`}
                              {progress.trackingInfo.receiver &&
                                ` | To: ${progress.trackingInfo.receiver}`}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
