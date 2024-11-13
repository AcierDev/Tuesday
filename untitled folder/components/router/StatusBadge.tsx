// components/status-badge.tsx
import { ConnectionStatus } from "@/typings/types";
import React from "react";

export const StatusBadge = ({ status }: { status: ConnectionStatus }) => {
  const variants = {
    connected:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    connecting:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    disconnected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium ${variants[status]}`}
    >
      {status === "connected" && "🟢 Connected"}
      {status === "connecting" && "🟡 Connecting..."}
      {status === "disconnected" && "🔴 Disconnected"}
    </span>
  );
};
