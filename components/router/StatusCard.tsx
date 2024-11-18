"use client";

// components/status-card.tsx
import React from "react";
import { Badge } from "@/components/ui/badge";

interface StatusCardProps {
  title: string;
  status: boolean;
  icon: React.ElementType;
  description: string;
}

export const StatusCard = ({
  title,
  status,
  icon: Icon,
  description,
}: StatusCardProps) => (
  <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors">
    <div className="flex items-center justify-between mb-2">
      <Icon
        className={`${
          status
            ? "text-green-500 dark:text-green-400"
            : "text-gray-400 dark:text-gray-500"
        }`}
        size={24}
      />
      <Badge variant={status ? "default" : "secondary"}>
        {status ? "Active" : "Inactive"}
      </Badge>
    </div>
    <h3 className="font-medium text-gray-900 dark:text-gray-100">{title}</h3>
    <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
  </div>
);
