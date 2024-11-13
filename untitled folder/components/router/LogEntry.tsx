// components/log-entry.tsx
import React from "react";
import { Info, AlertTriangle } from "lucide-react";
import { LogEntry as LogEntryType } from "@/typings/types";

export const LogEntry = ({ log }: { log: LogEntryType }) => {
  const icons = {
    info: Info,
    warning: AlertTriangle,
    error: AlertTriangle,
  };
  const Icon = icons[log.level];

  return (
    <div className="flex items-center gap-2 p-2 rounded bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
      <Icon
        className={`w-4 h-4 ${
          log.level === "info"
            ? "text-blue-500 dark:text-blue-400"
            : log.level === "warning"
            ? "text-yellow-500 dark:text-yellow-400"
            : "text-red-500 dark:text-red-400"
        }`}
      />
      <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
        {log.message}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {log.timestamp.toLocaleTimeString()}
      </span>
    </div>
  );
};
