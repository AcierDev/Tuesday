import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/utils/functions";

// Enhanced StatCard Component
interface StatCardProps {
  title: string;
  value: string | number | React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  isLoading?: boolean;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  isLoading = false,
}: StatCardProps) {
  return (
    <Card className="dark:bg-gray-800/50 dark:border-gray-700 dark:shadow-lg transition-all hover:dark:bg-gray-800/80">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground dark:text-gray-400">
              {title}
            </p>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold dark:text-gray-100">
                {value}
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground dark:text-gray-500">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {icon}
            {trend && (
              <div
                className={cn(
                  "rounded-full p-1",
                  trend === "up" ? "text-green-500" : "text-red-500"
                )}
              >
                {/* {trend === "up" ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )} */}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
