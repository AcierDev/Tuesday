"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
  Search,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";

import { ShippingDetails } from "@/components/shipping/ShippingDetails";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShippingItem } from "@/typings/interfaces";
import { ShippingStatus } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";

interface TrackingResponse {
  tracking_number: string;
  tracking_url: string;
  status_code: string;
  status_detail_code: string;
  carrier_code: string;
  carrier_id: number;
  status_description: string;
  status_detail_description: string;
  carrier_status_code: string;
  carrier_detail_code: string;
  carrier_status_description: string;
  ship_date: string;
  estimated_delivery_date: string;
  actual_delivery_date?: string;
  exception_description?: string;
  events: TrackingEvent[];
}

interface TrackingEvent {
  occurred_at: string;
  carrier_occurred_at: string;
  description: string;
  city_locality: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  company_name: string;
  signer: string;
  event_code: string;
  carrier_detail_code: string;
  status_code: string;
  status_detail_code: string;
  status_description: string;
  status_detail_description: string;
  carrier_status_code: string;
  carrier_status_description: string;
  latitude: number;
  longitude: number;
}

async function fetchTrackingData(labelId: string): Promise<TrackingResponse> {
  try {
    const response = await fetch(
      `https://docs.shipstation.com/_mock/openapi/v2/labels/${labelId}/track`,
      {
        method: "GET",
        headers: {
          "api-key": process.env.NEXT_PUBLIC_SHIP_STATION_API_KEY || "",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch tracking data: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("Error fetching ShipStation tracking data:", error);
    throw error;
  }
}

export default function ShippingPage() {
  const [items, setItems] = useState<ShippingItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShippingItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<ShippingItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { board } = useOrderStore();

  useEffect(() => {
    const filtered = items.filter(
      (item) =>
        item.values.some((value) =>
          String(value.text || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        ) ||
        item.shippingDetails?.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item.shippingDetails?.city.toString().includes(searchTerm)
    );
    setFilteredItems(filtered);
  }, [items, searchTerm]);

  useEffect(() => {
    if (board) {
      const itemsWithReceipts = board.items_page.items
        .map((item) => ({
          ...item,
          shippingDetails: item.shippingDetails || undefined,
        }))
        .filter((item) => !item.deleted && item.visible) as ShippingItem[];

      setItems(itemsWithReceipts);
      updateShipmentStatuses(itemsWithReceipts);
    }
  }, [board]);

  const updateShipmentStatuses = async (items: ShippingItem[]) => {
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        if (item.receipt?.shipments && item.receipt.shipments.length > 0) {
          const shipment = item.receipt.shipments[0]!;
          const labelId = shipment.label_id;

          if (labelId) {
            try {
              const trackingData = await fetchTrackingData(labelId);
              console.log(`${item.shippingDetails?.name}:`, trackingData);

              return {
                ...item,
                shipmentStatus: mapShipStationStatusToShippingStatus(
                  trackingData.status_detail_code
                ),
                trackingInfo: {
                  carrier: trackingData.carrier_code,
                  status: trackingData.status_description,
                  estimatedDelivery: trackingData.estimated_delivery_date,
                  currentStatusDescription:
                    trackingData.carrier_status_description,
                  trackingUrl: trackingData.tracking_url,
                  trackingNumber: trackingData.tracking_number,
                  events: trackingData.events.map((event) => ({
                    date: event.occurred_at,
                    description: event.description,
                    location: `${event.city_locality}, ${event.state_province} ${event.postal_code}`,
                    status: event.status_description,
                  })),
                },
              };
            } catch (error) {
              console.error(
                `Failed tracking update for ${item.shippingDetails?.name}:`,
                error
              );
              return item;
            }
          }
        }
        return { ...item, shipmentStatus: "unshipped" };
      })
    );

    setItems(updatedItems);
  };

  const mapShipStationStatusToShippingStatus = (
    statusCode: string
  ): ShippingStatus => {
    switch (statusCode) {
      case "DELIVERED":
        return "delivered";
      case "IN_TRANSIT":
      case "OUT_FOR_DELIVERY":
        return "in_transit";
      case "ACCEPTED":
      case "COLLECTION_FAILED":
        return "pre_transit";
      default:
        return "unshipped";
    }
  };

  const getStatusIcon = (status: ShippingStatus) => {
    switch (status) {
      case "unshipped":
        return <Package className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
      case "pre_transit":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "in_transit":
        return <Truck className="h-5 w-5 text-blue-500" />;
      case "delivered":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const handleViewDetails = (item: ShippingItem) => {
    setSelectedItem(item);
    setIsDetailsOpen(true);
  };

  const renderStatusCard = (status: ShippingStatus) => {
    const statusItems = filteredItems.filter(
      (item) => item.shipmentStatus === status
    );
    const cardTitle =
      status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");

    return (
      <Card key={status} className="w-full bg-white dark:bg-gray-800">
        <CardHeader className="bg-gray-100 dark:bg-gray-700">
          <CardTitle className="text-lg font-semibold flex items-center text-gray-900 dark:text-gray-100">
            {getStatusIcon(status)}
            <span className="ml-2">
              {cardTitle} ({statusItems.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {statusItems.length > 0 ? (
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
                      Service
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">
                      Est. Delivery
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">
                      Status
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <TableCell className="text-gray-900 dark:text-gray-100">
                        {item.id}
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">
                        {item.shippingDetails?.name || "N/A"}
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">
                        {item.receipt?.shipments?.[0]?.carrier || "N/A"}
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">
                        {item.receipt?.shipments?.[0]?.service || "N/A"}
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">
                        {item.trackingInfo?.estimatedDelivery
                          ? new Date(
                              item.trackingInfo.estimatedDelivery
                            ).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">
                        {item.trackingInfo?.status || "unknown"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(item)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">
              No orders in this status.
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <Card className="w-full max-w-7xl mx-auto mb-8 bg-white dark:bg-gray-800">
        <CardHeader className="bg-black text-white dark:bg-gray-800">
          <CardTitle className="text-2xl font-bold flex items-center">
            <Truck className="mr-2 h-6 w-6" />
            Shipping Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <Input
                className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderStatusCard("unshipped")}
            {renderStatusCard("pre_transit")}
            {renderStatusCard("in_transit")}
            {renderStatusCard("delivered")}
          </div>
        </CardContent>
      </Card>
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-white dark:bg-gray-800">
          {selectedItem ? (
            <ShippingDetails
              item={selectedItem}
              onClose={() => {
                setIsDetailsOpen(false);
                setSelectedItem(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
