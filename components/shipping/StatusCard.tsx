// components/shipping/StatusCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ShippingStatus } from "@/typings/types";
import { ShippingItem } from "@/typings/interfaces";
import { getStatusIcon } from "@/utils/functions";

interface StatusCardProps {
  status: ShippingStatus;
  items: ShippingItem[];
  onViewDetails: (item: ShippingItem) => void;
}

export const StatusCard: React.FC<StatusCardProps> = (
  { status, items, onViewDetails },
) => {
  const cardTitle = status.charAt(0).toUpperCase() +
    status.slice(1).replace("_", " ");

  return (
    <Card className="w-full bg-white dark:bg-gray-800">
      <CardHeader className="bg-gray-100 dark:bg-gray-700">
        <CardTitle className="text-lg font-semibold flex items-center text-gray-900 dark:text-gray-100">
          {getStatusIcon(status)}
          <span className="ml-2">{cardTitle} ({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="h-[300px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-700">
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Order ID
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Customer
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Carrier
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Est. Delivery
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <TableCell className="text-gray-900 dark:text-gray-100">
                    {item.receipt?.receipt_id || "N/A"}
                  </TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100">
                    {item.receipt?.name || "N/A"}
                  </TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100">
                    {item.trackingInfo?.carrier || "N/A"}
                  </TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100">
                    {item.trackingInfo?.estimatedDelivery || "N/A"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewDetails(item)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
