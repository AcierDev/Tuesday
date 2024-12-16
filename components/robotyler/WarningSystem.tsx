import React, { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion, useAnimation, PanInfo } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { X, AlertTriangle, AlertCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Warning {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  timestamp: Date;
  autoDismiss?: boolean;
  dismissTimeout?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline";
  }>;
}

interface WarningSystemProps {
  warnings: Warning[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
  defaultDismissTimeout?: number;
  pauseOnHover?: boolean;
  className?: string;
}

const DEFAULT_DISMISS_TIMEOUT = 5000;
const DEFAULT_MAX_VISIBLE = 3;
const SWIPE_THRESHOLD = 100;

const WarningSystem = ({
  warnings,
  onDismiss,
  maxVisible = DEFAULT_MAX_VISIBLE,
  defaultDismissTimeout = DEFAULT_DISMISS_TIMEOUT,
  pauseOnHover = true,
  className = "",
}: WarningSystemProps) => {
  const [isPaused, setIsPaused] = useState(false);
  const dismissTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const progressControls = useAnimation();

  const getIcon = (type: Warning["type"]) => {
    const commonClasses = "h-6 w-6";
    switch (type) {
      case "error":
        return (
          <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
            <Ban
              className={`${commonClasses} text-red-600 dark:text-red-400`}
            />
          </div>
        );
      case "warning":
        return (
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
            <AlertTriangle
              className={`${commonClasses} text-yellow-600 dark:text-yellow-400`}
            />
          </div>
        );
      case "info":
        return (
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
            <AlertCircle
              className={`${commonClasses} text-blue-600 dark:text-blue-400`}
            />
          </div>
        );
    }
  };

  const getAlertClass = (type: Warning["type"]) => {
    const baseClasses = "backdrop-blur-sm border-2 shadow-lg dark:shadow-none";
    switch (type) {
      case "error":
        return `${baseClasses} border-red-500/50 bg-white/80 dark:bg-gray-900/80 text-red-700 dark:text-red-400`;
      case "warning":
        return `${baseClasses} border-yellow-500/50 bg-white/80 dark:bg-gray-900/80 text-yellow-700 dark:text-yellow-400`;
      case "info":
        return `${baseClasses} border-blue-500/50 bg-white/80 dark:bg-gray-900/80 text-blue-700 dark:text-blue-400`;
    }
  };

  const getProgressBarClass = (type: Warning["type"]) => {
    switch (type) {
      case "error":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      case "info":
        return "bg-blue-500";
    }
  };

  const startDismissTimer = useCallback(
    (warning: Warning) => {
      if (warning.autoDismiss !== false) {
        const timeout = warning.dismissTimeout || defaultDismissTimeout;
        dismissTimers.current[warning.id] = setTimeout(() => {
          onDismiss(warning.id);
        }, timeout);

        // Start progress animation
        progressControls.start({
          scaleX: 0,
          transition: { duration: timeout / 1000, ease: "linear" },
        });
      }
    },
    [defaultDismissTimeout, onDismiss, progressControls]
  );

  const clearDismissTimer = useCallback((id: string) => {
    if (dismissTimers.current[id]) {
      clearTimeout(dismissTimers.current[id]);
      delete dismissTimers.current[id];
    }
  }, []);

  const pauseAllTimers = useCallback(() => {
    Object.keys(dismissTimers.current).forEach(clearDismissTimer);
    progressControls.stop();
  }, [clearDismissTimer, progressControls]);

  const resumeAllTimers = useCallback(() => {
    warnings.forEach((warning) => {
      if (!dismissTimers.current[warning.id]) {
        startDismissTimer(warning);
      }
    });
  }, [warnings, startDismissTimer]);

  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) {
      setIsPaused(true);
      pauseAllTimers();
    }
  }, [pauseOnHover, pauseAllTimers]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) {
      setIsPaused(false);
      resumeAllTimers();
    }
  }, [pauseOnHover, resumeAllTimers]);

  const handleDragEnd = useCallback(
    (info: PanInfo, warningId: string) => {
      if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
        clearDismissTimer(warningId);
        onDismiss(warningId);
      }
    },
    [clearDismissTimer, onDismiss]
  );

  useEffect(() => {
    warnings.forEach((warning) => {
      if (!dismissTimers.current[warning.id] && !isPaused) {
        startDismissTimer(warning);
      }
    });

    return () => {
      Object.keys(dismissTimers.current).forEach(clearDismissTimer);
    };
  }, [warnings, isPaused, startDismissTimer, clearDismissTimer]);

  const visibleWarnings = warnings.slice(-maxVisible);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const warningVariants = {
    initial: {
      opacity: 0,
      y: 20,
      scale: 0.95,
      rotateX: -10,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 300,
      },
    },
    exit: {
      opacity: 0,
      x: 100,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 300,
      },
    },
    hover: {
      scale: 1.02,
      transition: {
        type: "spring",
        damping: 10,
        stiffness: 300,
      },
    },
  };

  return (
    <motion.div
      className={`fixed bottom-6 right-6 z-50 space-y-4 max-w-md w-full ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
      aria-live="polite"
    >
      <AnimatePresence mode="sync">
        {visibleWarnings.map((warning) => (
          <motion.div
            key={warning.id}
            variants={warningVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            whileHover="hover"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.9}
            onDragEnd={(_, info) => handleDragEnd(info, warning.id)}
            className="relative"
          >
            <Alert
              className={`${getAlertClass(
                warning.type
              )} relative pr-12 rounded-xl overflow-hidden`}
              role="alertdialog"
              aria-labelledby={`warning-title-${warning.id}`}
              aria-describedby={`warning-desc-${warning.id}`}
            >
              <div className="flex items-start gap-4">
                {getIcon(warning.type)}
                <div className="flex-1 min-w-0">
                  <AlertTitle
                    id={`warning-title-${warning.id}`}
                    className="text-lg font-semibold mb-1 truncate"
                  >
                    {warning.title}
                  </AlertTitle>
                  <AlertDescription
                    id={`warning-desc-${warning.id}`}
                    className="text-sm opacity-90"
                  >
                    <div className="line-clamp-2">{warning.message}</div>
                    <div className="text-xs opacity-75 mt-2 flex items-center gap-2">
                      <span>
                        {new Date(warning.timestamp).toLocaleTimeString()}
                      </span>
                      {warning.actions && (
                        <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                      )}
                    </div>
                    {warning.actions && warning.actions.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {warning.actions.map((action, index) => (
                          <Button
                            key={index}
                            variant={action.variant || "outline"}
                            size="sm"
                            onClick={() => {
                              action.onClick();
                              clearDismissTimer(warning.id);
                            }}
                            className="text-xs font-medium hover:scale-105 transition-transform"
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-2 opacity-70 hover:opacity-100 hover:scale-110 transition-all"
                onClick={() => {
                  clearDismissTimer(warning.id);
                  onDismiss(warning.id);
                }}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
              {warning.autoDismiss !== false && (
                <motion.div
                  className={`absolute bottom-0 left-0 right-0 h-0.5 ${getProgressBarClass(
                    warning.type
                  )} opacity-50`}
                  initial={{ scaleX: 1 }}
                  animate={progressControls}
                  style={{ transformOrigin: "0% 50%" }}
                />
              )}
            </Alert>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default WarningSystem;
