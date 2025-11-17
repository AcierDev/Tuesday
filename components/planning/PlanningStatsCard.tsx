"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/functions";
import { Package, AlertCircle, Clock, TrendingUp } from "lucide-react";

interface PlanningStatsCardProps {
  title: string;
  orders: number;
  blocks: number;
  variant?: "default" | "danger" | "warning" | "success";
}

export function PlanningStatsCard({
  title,
  orders,
  blocks,
  variant = "default",
}: PlanningStatsCardProps) {
  const variantStyles = {
    default: {
      bg: "bg-blue-50 dark:bg-blue-950/20",
      border: "border-blue-200 dark:border-blue-800/30",
      icon: "text-blue-600 dark:text-blue-400",
      textPrimary: "text-blue-900 dark:text-blue-100",
      textSecondary: "text-blue-700 dark:text-blue-300",
    },
    danger: {
      bg: "bg-red-50 dark:bg-red-950/20",
      border: "border-red-200 dark:border-red-800/30",
      icon: "text-red-600 dark:text-red-400",
      textPrimary: "text-red-900 dark:text-red-100",
      textSecondary: "text-red-700 dark:text-red-300",
    },
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-950/20",
      border: "border-yellow-200 dark:border-yellow-800/30",
      icon: "text-yellow-600 dark:text-yellow-400",
      textPrimary: "text-yellow-900 dark:text-yellow-100",
      textSecondary: "text-yellow-700 dark:text-yellow-300",
    },
    success: {
      bg: "bg-green-50 dark:bg-green-950/20",
      border: "border-green-200 dark:border-green-800/30",
      icon: "text-green-600 dark:text-green-400",
      textPrimary: "text-green-900 dark:text-green-100",
      textSecondary: "text-green-700 dark:text-green-300",
    },
  };

  const styles = variantStyles[variant];

  const getIcon = () => {
    switch (variant) {
      case "danger":
        return <AlertCircle className={cn("h-5 w-5", styles.icon)} />;
      case "warning":
        return <Clock className={cn("h-5 w-5", styles.icon)} />;
      case "success":
        return <TrendingUp className={cn("h-5 w-5", styles.icon)} />;
      default:
        return <Package className={cn("h-5 w-5", styles.icon)} />;
    }
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-lg",
        styles.bg,
        styles.border
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn("text-sm font-medium", styles.textSecondary)}>
          {title}
        </CardTitle>
        {getIcon()}
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-bold", styles.textPrimary)}>
          {orders}
        </div>
        <p className={cn("text-xs mt-1", styles.textSecondary)}>
          {blocks.toLocaleString()} blocks
        </p>
      </CardContent>
    </Card>
  );
}


