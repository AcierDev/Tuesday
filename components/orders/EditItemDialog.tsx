"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ClipboardCopy } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { type Item } from "../../typings/types";

interface Shipment {
  tracking_code: string;
}

interface EditItemDialogProps {
  editingItem: Item | null;
  setEditingItem: (item: Item | null) => void;
  handleSaveEdit: (updatedItem: Item) => Promise<void>;
}

export const EditItemDialog = ({
  editingItem,
  setEditingItem,
  handleSaveEdit,
}: EditItemDialogProps) => {
  const [activeTab, setActiveTab] = useState("item");
  const [localReceipt, setLocalReceipt] = useState<Partial<Address> | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setLocalReceipt(editingItem.shippingDetails || {});
    } else {
      setLocalReceipt(null);
    }
  }, [editingItem]);

  const updateItemValue = (columnName: string, value: string) => {
    if (!editingItem) return;
    const newValues = editingItem.values.map((v) =>
      v.columnName === columnName ? { ...v, text: value } : v
    );
    setEditingItem({ ...editingItem, values: newValues });
  };

  const updateReceiptValue = (key: keyof Address, value: any) => {
    if (!localReceipt) return;
    setLocalReceipt((prevReceipt) => ({
      ...prevReceipt,
      [key]: value,
    }));
  };

  const updateTrackingNumber = (value: string) => {
    if (!localReceipt) return;
    const updatedShipments: Shipment[] = localReceipt.shipments
      ? localReceipt.shipments.map((shipment, index) =>
          index === 0 ? { ...shipment, tracking_code: value } : shipment
        )
      : [{ tracking_code: value } as Shipment];

    setLocalReceipt((prevReceipt) => ({
      ...prevReceipt,
      shipments: updatedShipments,
    }));
  };

  const handleSave = async () => {
    if (editingItem) {
      setIsSaving(true);
      try {
        const updatedItem = {
          ...editingItem,
          shippingDetails: localReceipt || undefined,
          tags: editingItem.tags || undefined,
        };
        setEditingItem(updatedItem);
        await handleSaveEdit(updatedItem);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <Dialog
      open={Boolean(editingItem)}
      onOpenChange={(open) => !open && !isSaving && setEditingItem(null)}
    >
      <DialogContent className="sm:max-w-[600px] dark:bg-gray-900 p-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              Edit Item
            </DialogTitle>
          </DialogHeader>

          <Tabs
            className="w-full"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <div className="px-6 mb-4">
              <TabsList className="w-full grid grid-cols-3 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <TabsTrigger
                  value="item"
                  className={cn(
                    "data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700",
                    "transition-all duration-200"
                  )}
                >
                  Item Details
                </TabsTrigger>
                <TabsTrigger
                  value="shipping"
                  className={cn(
                    "data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700",
                    "transition-all duration-200"
                  )}
                >
                  Shipping Details
                </TabsTrigger>
                <TabsTrigger
                  value="tags"
                  className={cn(
                    "data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700",
                    "transition-all duration-200"
                  )}
                >
                  Tags
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="item" className="px-6">
              <Card className="border-none dark:bg-gray-800 shadow-none">
                <CardContent className="space-y-4 pt-4">
                  <motion.div
                    className="space-y-4"
                    initial={false}
                    animate={{ opacity: 1 }}
                    transition={{ staggerChildren: 0.1 }}
                  >
                    {editingItem?.values
                      .filter((value) => value.text)
                      .map((value) => (
                        <motion.div
                          key={value.columnName}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="grid grid-cols-4 items-center gap-4"
                        >
                          <Label
                            className="text-right font-medium"
                            htmlFor={value.columnName}
                          >
                            {value.columnName}
                          </Label>
                          <Input
                            className="col-span-3 dark:bg-gray-700 dark:border-none transition-colors"
                            id={value.columnName}
                            value={value.text}
                            onChange={(e) =>
                              updateItemValue(value.columnName, e.target.value)
                            }
                          />
                        </motion.div>
                      ))}
                  </motion.div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shipping" className="px-6">
              <Card className="border-none dark:bg-gray-800 shadow-none">
                <CardContent className="space-y-6 pt-4">
                  <motion.div
                    className="space-y-6"
                    initial={false}
                    animate={{ opacity: 1 }}
                    transition={{ staggerChildren: 0.1 }}
                  >
                    {/* Customer Information Section */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Customer Information
                      </h3>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="grid grid-cols-4 items-center gap-4"
                      >
                        <Label
                          className="text-right font-medium"
                          htmlFor="receipt_id"
                        >
                          Receipt ID
                        </Label>
                        <Input
                          className="col-span-3 dark:bg-gray-700 dark:border-none transition-colors"
                          id="receipt_id"
                          value={localReceipt?.id || ""}
                          onChange={(e) =>
                            updateReceiptValue(
                              "receipt_id",
                              parseInt(e.target.value) || ""
                            )
                          }
                        />
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="grid grid-cols-4 items-center gap-4"
                      >
                        <Label
                          className="text-right font-medium"
                          htmlFor="buyer_email"
                        >
                          Buyer Email
                        </Label>
                        <Input
                          className="col-span-3 dark:bg-gray-700 dark:border-none transition-colors"
                          id="buyer_email"
                          value={localReceipt?.buyer_email || ""}
                          onChange={(e) =>
                            updateReceiptValue("buyer_email", e.target.value)
                          }
                        />
                      </motion.div>
                    </div>

                    {/* Shipping Address Section */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Shipping Address
                      </h3>
                      <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4 space-y-4">
                        {[
                          { label: "Name", key: "name" },
                          { label: "Address", key: "street1" },
                          { label: "City", key: "city" },
                          { label: "State", key: "state" },
                          { label: "ZIP", key: "postalCode" },
                        ].map((field) => (
                          <motion.div
                            key={field.key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="grid grid-cols-4 items-center gap-4"
                          >
                            <Label
                              className="text-right font-medium"
                              htmlFor={field.key}
                            >
                              {field.label}
                            </Label>
                            <Input
                              className="col-span-3 dark:bg-gray-700 dark:border-none transition-colors"
                              id={field.key}
                              value={localReceipt?.[field.key] || ""}
                              onChange={(e) =>
                                updateReceiptValue(field.key, e.target.value)
                              }
                            />
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Tracking Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Tracking Information
                      </h3>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="grid grid-cols-4 items-center gap-4"
                      >
                        <Label
                          className="text-right font-medium"
                          htmlFor="tracking"
                        >
                          Tracking Number
                        </Label>
                        <div className="col-span-3 flex gap-2">
                          <Input
                            className="flex-1 dark:bg-gray-700 dark:border-none transition-colors"
                            id="tracking"
                            value={
                              localReceipt?.shipments?.[0]?.tracking_code || ""
                            }
                            onChange={(e) =>
                              updateTrackingNumber(e.target.value)
                            }
                          />
                          {localReceipt?.shipments?.[0]?.tracking_code && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  localReceipt.shipments[0].tracking_code
                                );
                              }}
                            >
                              <ClipboardCopy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tags" className="px-6">
              <Card className="border-none dark:bg-gray-800 shadow-none">
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Label htmlFor="vertical-toggle" className="font-medium">
                        Vertical Layout
                      </Label>
                      <Switch
                        checked={editingItem?.tags?.isVertical || false}
                        id="vertical-toggle"
                        onCheckedChange={(checked) => {
                          if (editingItem) {
                            setEditingItem({
                              ...editingItem,
                              tags: {
                                ...editingItem.tags,
                                isVertical: checked,
                              },
                            });
                          }
                        }}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Label
                        htmlFor="difficult-customer"
                        className="font-medium"
                      >
                        Difficult Customer
                      </Label>
                      <Switch
                        checked={
                          editingItem?.tags?.isDifficultCustomer || false
                        }
                        id="difficult-customer"
                        onCheckedChange={(checked) => {
                          if (editingItem) {
                            setEditingItem({
                              ...editingItem,
                              tags: {
                                ...editingItem.tags,
                                isDifficultCustomer: checked,
                              },
                            });
                          }
                        }}
                        className="data-[state=checked]:bg-red-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Label htmlFor="customer-message" className="font-medium">
                        Customer Message
                      </Label>
                      <Switch
                        checked={editingItem?.tags?.hasCustomerMessage || false}
                        id="customer-message"
                        onCheckedChange={(checked) => {
                          if (editingItem) {
                            setEditingItem({
                              ...editingItem,
                              tags: {
                                ...editingItem.tags,
                                hasCustomerMessage: checked,
                              },
                            });
                          }
                        }}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <footer className="mt-6 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-end gap-4 px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50">
              <Button
                variant="outline"
                onClick={() => !isSaving && setEditingItem(null)}
                disabled={isSaving}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </footer>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
