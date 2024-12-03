"use client";

// components/status-badge.tsx
import React from "react";

export const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, string> = {
    connected:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    disconnected:
      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    error: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    idle: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  };

  const statusText: Record<string, string> = {
    connected: "Connected",
    disconnected: "Disconnected",
    error: "Error",
    idle: "Idle",
  };

  const icons: Record<string, string> = {
    connected: "🟢",
    disconnected: "🔴",
    error: "🔴",
    idle: "🟡",
  };

  return (
    <span
      className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
        variants[status] || variants.error
      }`}
    >
      {icons[status]}
      {statusText[status] || status}
    </span>
  );
};
