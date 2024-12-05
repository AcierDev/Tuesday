"use client";

import React, { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

interface StatusCardProps {
  title: string;
  status: boolean;
  icon: React.ElementType;
  description: string;
  duration?: number;
  isActive?: boolean;
}

export const StatusCard = ({
  title,
  status,
  icon: Icon,
  description,
  duration,
  isActive = false,
}: StatusCardProps) => {
  const controls = useAnimation();

  useEffect(() => {
    if (isActive && duration) {
      controls.set({ scaleX: 0, opacity: 1 });
      controls.start({
        scaleX: [0, 1],
        opacity: 1,
        transition: {
          duration: duration / 1000,
          ease: "linear",
        },
      });
    } else {
      controls.start({
        opacity: 0,
        transition: {
          duration: 0.3,
          ease: "easeOut",
        },
      });
    }
  }, [isActive, duration, controls]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative p-4 rounded-lg border transition-colors overflow-hidden ${
        isActive
          ? "bg-blue-500/10 dark:bg-blue-900/20 border-blue-500/50 dark:border-blue-400/30"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      }`}
    >
      {/* Background progress bar */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={controls}
        className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500/80 to-purple-500/80 origin-left"
      />

      <div className="flex items-center justify-between mb-2 relative">
        <motion.div
          animate={
            status
              ? {
                  scale: [1, 1.2, 1],
                  transition: {
                    duration: 0.3,
                    repeat: isActive ? Infinity : 0,
                    repeatType: "reverse",
                  },
                }
              : {}
          }
        >
          <Icon
            className={`${
              status
                ? isActive
                  ? "text-blue-500 dark:text-blue-400 drop-shadow-glow"
                  : "text-green-500 dark:text-green-400"
                : "text-gray-400 dark:text-gray-500"
            }`}
            size={24}
          />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={status ? "active" : "inactive"}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <Badge
              variant={status ? "default" : "secondary"}
              className={
                isActive
                  ? "bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                  : ""
              }
            >
              {status ? "Active" : "Inactive"}
            </Badge>
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {description}
          {duration && (
            <span
              className={`ml-1 text-xs font-medium ${
                isActive
                  ? "text-blue-500 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              ({(duration / 1000).toFixed(1)}s)
            </span>
          )}
        </p>
      </motion.div>

      {/* Enhanced ripple effect when active */}
      <AnimatePresence>
        {isActive && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0.3 }}
              animate={{
                scale: 1.2,
                opacity: 0,
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="absolute inset-0 border-2 border-blue-500/30 dark:border-blue-400/30 rounded-lg"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0.3 }}
              animate={{
                scale: 1.2,
                opacity: 0,
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.5,
              }}
              className="absolute inset-0 border-2 border-blue-500/20 dark:border-blue-400/20 rounded-lg"
            />
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
