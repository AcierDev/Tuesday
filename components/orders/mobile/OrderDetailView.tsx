import React from "react";
import {
  X,
  Edit,
  Trash2,
  Ship,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRightSquare,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ColumnTitles } from "@/typings/types";
import { STATUS_COLORS } from "@/typings/constants";
import {
  OrderItem,
  getDaysRemaining,
  formatDate,
  processItem,
} from "../utils/orderUtils";
import { CustomTableCell } from "../../cells/CustomTableCell";
import { DesignDropdownCell } from "../../cells/DesignDropdownCell";
import { DropdownCell } from "../../cells/DropdownCell";
import { ShippingStatusDisplay } from "./ShippingStatusDisplay";
import { useOrderStore } from "@/stores/useOrderStore";
import { cn } from "@/utils/functions";
import { getStatusColor } from "../ItemGroup";

interface OrderDetailViewProps {
  orderId: string;
  onClose: () => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onShip: (itemId: string) => void;
  onMarkCompleted: (itemId: string) => void;
  onGetLabel: (item: Item) => void;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({
  orderId,
  onClose,
  onEdit,
  onDelete,
  onShip,
  onMarkCompleted,
}) => {
  const { items } = useOrderStore();
  const item = items.find((o) => o.id === orderId);
  if (!item) return null;
  const processedItem = processItem(item);

  const daysRemaining = getDaysRemaining(processedItem.dueDate || "");
  const isPastDue = daysRemaining < 0;

  const renderColumnValue = (columnName: ColumnTitles) => {
    const value = processedItem.values.find((v) => v.columnName === columnName);
    if (!value) return <span className="text-sm text-gray-500">N/A</span>;
    return (
      <CustomTableCell columnValue={value} isNameColumn={false} item={item} />
    );
  };

  const DetailItem: React.FC<{ label: string; children: React.ReactNode }> = ({
    label,
    children,
  }) => (
    <div className="bioa">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Order Details
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs ${STATUS_COLORS[item.status]}`}
            >
              {item.status}
            </Badge>
            <ShippingStatusDisplay orderId={item.id} />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-grow p-4 dark:bg-gray-800">
        <div className="space-y-4 pb-4">
          <Card className="dark:bg-gray-700">
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{processedItem.customerName || "N/A"}</p>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-700">
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailItem label="Design">
                <DesignDropdownCell
                  item={item}
                  columnValue={
                    item.values.find(
                      (v) => v.columnName === ColumnTitles.Design
                    )!
                  }
                  onUpdate={() => {}}
                />
              </DetailItem>
              <DetailItem label="Size">
                <DropdownCell
                  item={item}
                  columnValue={
                    item.values.find((v) => v.columnName === ColumnTitles.Size)!
                  }
                  onUpdate={() => {}}
                />
              </DetailItem>
              <DetailItem label="Due Date">
                <span
                  className={`flex items-center gap-1 ${
                    isPastDue ? "text-red-500 dark:text-red-400" : ""
                  }`}
                >
                  {processedItem.dueDate
                    ? formatDate(processedItem.dueDate)
                    : "No date"}
                </span>
              </DetailItem>
              <DetailItem label="Status">
                <Badge className={STATUS_COLORS[item.status]}>
                  {item.status}
                </Badge>
              </DetailItem>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-700">
            <CardHeader>
              <CardTitle className="text-base">Production Status</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailItem label="Painted">
                <div
                  className={cn(
                    "border-2 dark:border-gray-600 rounded-md",
                    getStatusColor(
                      processedItem.values.find(
                        (v) => v.columnName === ColumnTitles.Painted
                      )!
                    )
                  )}
                >
                  {renderColumnValue(ColumnTitles.Painted)}
                </div>
              </DetailItem>
              <DetailItem label="Backboard">
                <div
                  className={cn(
                    "border-2 dark:border-gray-600 rounded-md",
                    getStatusColor(
                      processedItem.values.find(
                        (v) => v.columnName === ColumnTitles.Backboard
                      )!
                    )
                  )}
                >
                  {renderColumnValue(ColumnTitles.Backboard)}
                </div>
              </DetailItem>
              <DetailItem label="Glued">
                <div
                  className={cn(
                    "border-2 dark:border-gray-600 rounded-md",
                    getStatusColor(
                      processedItem.values.find(
                        (v) => v.columnName === ColumnTitles.Glued
                      )!
                    )
                  )}
                >
                  {renderColumnValue(ColumnTitles.Glued)}
                </div>
              </DetailItem>
              <DetailItem label="Packaging">
                <div
                  className={cn(
                    "border-2 dark:border-gray-600 rounded-md",
                    getStatusColor(
                      processedItem.values.find(
                        (v) => v.columnName === ColumnTitles.Packaging
                      )!
                    )
                  )}
                >
                  {renderColumnValue(ColumnTitles.Packaging)}
                </div>
              </DetailItem>
              <DetailItem label="Boxes">
                <div
                  className={cn(
                    "border-2 dark:border-gray-600 rounded-md",
                    getStatusColor(
                      processedItem.values.find(
                        (v) => v.columnName === ColumnTitles.Boxes
                      )!
                    )
                  )}
                >
                  {renderColumnValue(ColumnTitles.Boxes)}
                </div>
              </DetailItem>
            </CardContent>
          </Card>

          {item.tags &&
            (item.tags.isDifficultCustomer ||
              item.tags.isVertical ||
              item.tags.hasCustomerMessage) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.isDifficultCustomer && (
                      <Badge
                        variant="outline"
                        className="border-red-400 text-red-600 dark:border-red-600 dark:text-red-400"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" /> Difficult
                        Customer
                      </Badge>
                    )}
                    {item.tags.isVertical && (
                      <Badge
                        variant="outline"
                        className="border-blue-400 text-blue-600 dark:border-blue-600 dark:text-blue-400"
                      >
                        <ArrowUpRightSquare className="h-3 w-3 mr-1" /> Vertical
                      </Badge>
                    )}
                    {item.tags.hasCustomerMessage && (
                      <Badge
                        variant="outline"
                        className="border-green-400 text-green-600 dark:border-green-600 dark:text-green-400"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" /> Has Message
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </ScrollArea>

      <div className="sticky bottom-0 z-10 p-4 border-t bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Button
            variant="outline"
            onClick={() => onEdit(item)}
            className="dark:bg-gray-700"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => onDelete(item)}
            className="dark:bg-gray-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => onShip(item.id)}
            className="dark:bg-gray-700"
          >
            <Ship className="mr-2 h-4 w-4" />
            Mark Shipped
          </Button>
          <Button onClick={() => onMarkCompleted(item.id)}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark Completed
          </Button>
        </div>
      </div>
    </div>
  );
};
