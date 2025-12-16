import React from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  AlertTriangle,
  ArrowUpRightSquare,
  MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/functions";
import { ItemStatus, DayName } from "@/typings/types";
import { STATUS_BORDER_COLORS } from "@/typings/constants";
import {
  OrderItem,
  getDaysRemaining,
  formatDate,
  createBackground,
} from "../utils/orderUtils";

import { parseMinecraftColors } from "@/parseMinecraftColors";
import { useTheme } from "next-themes";

interface OrderCardProps {
  item: OrderItem;
  onSelect: (item: OrderItem) => void;
  clickToAddTarget?: { day: DayName; weekKey: string } | null;
}

export const OrderCard: React.FC<OrderCardProps> = React.memo(
  ({ item, onSelect, clickToAddTarget }) => {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    // Parse customer name with Minecraft colors
    const parsedCustomerName = parseMinecraftColors(
      item.customerName || "Unknown Customer",
      isDark
    );

    const daysRemaining = getDaysRemaining(item.dueDate || "");
    const isPastDue = daysRemaining < 0;

    const tags = [];
    if (item.tags?.isDifficultCustomer)
      tags.push({
        icon: AlertTriangle,
        text: "Difficult",
        color: "text-red-500",
      });
    if (item.tags?.isVertical)
      tags.push({
        icon: ArrowUpRightSquare,
        text: "Vertical",
        color: "text-blue-500",
      });
    if (item.tags?.hasCustomerMessage)
      tags.push({
        icon: MessageSquare,
        text: "Message",
        color: "text-green-500",
      });

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect(item)}
        className={cn(
          "mb-3 px-1",
          clickToAddTarget && "ring-2 ring-primary ring-offset-2 rounded-lg"
        )}
      >
        <Card 
          className={cn(
            "overflow-hidden bg-[#1c1c1e] border-0 text-white shadow-lg rounded-xl dark:bg-gray-800",
            "border-l-4",
            STATUS_BORDER_COLORS[item.status] ?? "border-l-transparent"
          )}
        >
          <div className="p-3">
            {/* Header Line */}
            <div className="text-sm font-medium mb-2 text-gray-200 truncate">
              {parsedCustomerName}
            </div>

            <div className="flex gap-3">
              {/* Thumbnail Image Placeholder */}
              <div
                className="w-20 h-20 flex-shrink-0 rounded-md shadow-inner"
                style={{
                    background: createBackground(item.design),
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
              />

              {/* Content Column */}
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div className="space-y-0.5">
                    <div className="text-sm text-gray-400">
                        Design: <span className="text-white">"{item.design || "N/A"}"</span>
                    </div>
                    <div className="text-sm text-gray-400">
                        Size: <span className="text-white">{item.size || "N/A"}</span>
                    </div>
                    <div className={cn("text-sm", isPastDue ? "text-red-400 font-medium" : "text-gray-400")}>
                        Due: <span className={cn(isPastDue ? "text-red-400" : "text-white")}>{item.dueDate ? formatDate(item.dueDate) : "N/A"}</span>
                    </div>
                </div>

                {/* Status Badge & Tags */}
                <div className="flex justify-between items-end mt-1">
                    <div className="flex gap-1">
                        {tags.map((tag, i) => (
                            <tag.icon key={i} className={cn("w-4 h-4", tag.color)} />
                        ))}
                    </div>
                    <Badge
                        className={cn(
                            "px-2 py-0.5 text-xs font-semibold rounded pointer-events-none",
                            item.status === ItemStatus.New ? "bg-blue-600 hover:bg-blue-600 text-white" :
                            item.status === ItemStatus.Wip ? "bg-orange-500 hover:bg-orange-500 text-white" :
                            "bg-gray-700 hover:bg-gray-700 text-gray-200"
                        )}
                    >
                        {item.status === ItemStatus.New ? "New" : 
                         item.status === ItemStatus.Wip ? "Processing" : 
                         item.status}
                    </Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }
);

OrderCard.displayName = "OrderCard";
