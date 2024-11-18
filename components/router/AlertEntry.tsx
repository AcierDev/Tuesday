"use client";

// components/alert-entry.tsx
import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Alert as AlertType } from "../../typings/types";

export const AlertEntry = ({ alert }: { alert: AlertType }) => (
  <div
    className={`flex items-center justify-between p-2 rounded border ${
      alert.level === "error"
        ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
        : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
    }`}
  >
    <div className="flex items-center gap-2">
      <AlertTriangle
        className={`w-4 h-4 ${
          alert.level === "error"
            ? "text-red-500 dark:text-red-400"
            : "text-yellow-500 dark:text-yellow-400"
        }`}
      />
      <span className="text-sm text-gray-900 dark:text-gray-100">
        {alert.message}
      </span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {alert.timestamp.toLocaleTimeString()}
      </span>
      {alert.acknowledged && (
        <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400" />
      )}
    </div>
  </div>
);
