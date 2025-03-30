import React from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  AlertTriangle,
  ArrowUpRightSquare,
  MessageSquare,
} from "lucide-react";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/functions";
import { ItemStatus } from "@/typings/types";
import { STATUS_BORDER_COLORS, STATUS_COLORS } from "@/typings/constants";
import {
  OrderItem,
  getDaysRemaining,
  formatDate,
  createBackground,
} from "../utils/orderUtils";
import { ShippingStatusIcon } from "../ShippingStatusIcon";

interface OrderCardProps {
  item: OrderItem;
  onSelect: (item: OrderItem) => void;
}

export const OrderCard: React.FC<OrderCardProps> = React.memo(
  ({ item, onSelect }) => {
    const daysRemaining = getDaysRemaining(item.dueDate || "");
    const isPastDue = daysRemaining < 0;
    const isNearDue = daysRemaining >= 0 && daysRemaining <= 7;

    const tags = [];
    if (item.tags?.isDifficultCustomer)
      tags.push({
        icon: AlertTriangle,
        text: "Difficult",
        color: "text-red-500 dark:text-red-400",
      });
    if (item.tags?.isVertical)
      tags.push({
        icon: ArrowUpRightSquare,
        text: "Vertical",
        color: "text-blue-500 dark:text-blue-400",
      });
    if (item.tags?.hasCustomerMessage)
      tags.push({
        icon: MessageSquare,
        text: "Message",
        color: "text-green-500 dark:text-green-400",
      });

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.25 }}
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.02, transition: { duration: 0.1 } }}
        onClick={() => onSelect(item)}
        className="mb-3 cursor-pointer"
      >
        <Card
          className={cn(
            "overflow-hidden dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-sm transition-shadow duration-200 hover:shadow-md",
            "border-l-4",
            STATUS_BORDER_COLORS[item.status] ?? "border-l-transparent"
          )}
        >
          <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between space-x-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 border dark:border-gray-600">
                <ShippingStatusIcon orderId={item.id} />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium truncate leading-tight flex items-center">
                  {item.customerName || "Unknown Customer"}
                </CardTitle>
                <div className="flex items-center gap-1.5 mt-0.5 mt-2">
                  {item.design && (
                    <div
                      className="inline-flex items-center justify-center px-2.5 h-5 min-h-0 text-[10px] font-medium text-white rounded-full"
                      style={{ background: createBackground(item.design) }}
                    >
                      {item.design}
                    </div>
                  )}
                  {item.size && (
                    <div className="inline-flex items-center justify-center px-2.5 h-5 min-h-0 text-[10px] font-medium text-white rounded-full bg-blue-500 dark:bg-blue-600">
                      {item.size}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Badge
              className={cn(
                "text-xs px-2 py-0.5 flex-shrink-0 border bg-transparent",
                "border-" + STATUS_COLORS[item.status],
                "text-" + STATUS_COLORS[item.status]
              )}
            >
              {item.status}
            </Badge>
          </CardHeader>

          <CardFooter className="p-3 pt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2 overflow-hidden">
              {tags.length > 0 ? (
                tags.map((tag, index) => (
                  <span
                    key={index}
                    title={tag.text}
                    className={`flex items-center gap-1 ${tag.color}`}
                  >
                    <tag.icon className="h-3 w-3" />
                  </span>
                ))
              ) : (
                <span className="italic text-gray-400 dark:text-gray-500"></span>
              )}
            </div>

            <div
              className={cn(
                "flex items-center gap-1 whitespace-nowrap",
                item.status === ItemStatus.Done
                  ? "text-white dark:text-white"
                  : isPastDue
                  ? "text-red-500 dark:text-red-400 font-medium"
                  : isNearDue
                  ? "text-amber-500 dark:text-amber-400 font-medium"
                  : ""
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-medium">
                {item.dueDate ? formatDate(item.dueDate) : "No date"}
              </span>
              {(isPastDue || isNearDue) &&
                item.status !== ItemStatus.Done &&
                item.dueDate && (
                  <Badge
                    variant={isPastDue ? "destructive" : "outline"}
                    className={`text-[10px] px-1.5 py-0.5 h-auto ml-1 ${
                      isNearDue
                        ? "border-amber-400 dark:border-amber-500 text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/50"
                        : ""
                    }`}
                  >
                    {isPastDue
                      ? `${Math.abs(daysRemaining)}d late`
                      : `${daysRemaining}d left`}
                  </Badge>
                )}
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    );
  }
);

OrderCard.displayName = "OrderCard";
