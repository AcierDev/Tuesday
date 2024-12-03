"use client";

// components/status-badge.tsx
import React from "react";

export const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, string> = {
    connected:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    disconnected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    idle: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  };

  const statusText: Record<string, string> = {
    connected: "🟢 Connected",
    disconnected: "🔴 Disconnected",
    error: "🔴 Error",
    idle: "🟡 Idle",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium ${
        variants[status] || variants.error
      }`}
    >
      {statusText[status] || status}
    </span>
  );
};
