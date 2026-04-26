import React, { useState } from "react";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Pencil,
  X,
  User,
  Box,
  Palette,
  CalendarDays,
  RotateCw,
  CheckCircle,
  ArrowUpDown,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/functions";

import {
  ItemDesigns,
  ItemSizes,
  ItemStatus,
  Item,
} from "../../typings/types";

interface NewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newItem: Partial<Item>) => Promise<void>;
}

const SuccessAnimation = () => (
  <motion.div
    className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <motion.div
      className="bg-green-500 text-white rounded-full p-4"
      initial={{ scale: 0, rotate: -180 }}
      animate={{
        scale: [0, 1.2, 1],
        rotate: 0,
      }}
      exit={{ scale: 0, rotate: 180 }}
      transition={{ duration: 0.5 }}
    >
      <CheckCircle className="w-16 h-16" />
    </motion.div>
  </motion.div>
);

export const NewItemModal: React.FC<NewItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [company, setCompany] = useState("Everwood");
  const [customerName, setCustomerName] = useState("");
  const [size, setSize] = useState("");
  const [design, setDesign] = useState("");
  const [vertical, setVertical] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customSize, setCustomSize] = useState(false);
  const [customDesign, setCustomDesign] = useState(false);

  const toggleCustomInput = (field: "size" | "design") => {
    if (field === "size") {
      setCustomSize(!customSize);
      if (customSize) setSize("");
    } else {
      setCustomDesign(!customDesign);
      if (customDesign) setDesign("");
    }
  };

  const sendNotification = async (
    customerName: string,
    size: string,
    design: string
  ) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customerName, size, design }),
      });

      if (!response.ok) {
        throw new Error("Failed to send notification");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const handleSubmit = async () => {
    if (!customerName || !size || !design) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    const prefix =
      company === "Woodform" ? "[WF] " : company === "Sheppit" ? "[SH] " : "";

    const newItem: any = {
      status: ItemStatus.New,
      createdAt: Date.now(),
      vertical,
      visible: true,
      deleted: false,
      isScheduled: false,
      customerName: `${prefix}${customerName}`,
      size,
      design,
      dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : "",
    };

    try {
      await onSubmit(newItem);
      await sendNotification(customerName, size, design);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        resetForm();
      }, 1000);
    } catch (error) {
      console.error("Error submitting item:", error);
      alert("Failed to submit item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCompany("Everwood");
    setCustomerName("");
    setSize("");
    setDesign("");
    setVertical(false);
    setDueDate(undefined);
    setShowCalendar(false);
    setIsSubmitting(false);
  };

  return (
    <>
      <AnimatePresence>{showSuccess && <SuccessAnimation />}</AnimatePresence>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto p-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white dark:bg-gray-800"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 px-6 py-4 border-b dark:border-gray-700">
              <div className="flex justify-between items-center">
                <DialogTitle className="text-xl font-semibold">
                  Create New Item
                </DialogTitle>
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={resetForm}
                  >
                    <RotateCw className="h-4 w-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 space-y-6">
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right flex items-center justify-end gap-2">
                    <Building2 className="h-4 w-4" />
                    Company
                  </Label>
                  <div className="col-span-3 flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setCompany("Everwood")}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200",
                        company === "Everwood"
                          ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      )}
                    >
                      Everwood
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompany("Woodform")}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200",
                        company === "Woodform"
                          ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      )}
                    >
                      Woodform
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompany("Sheppit")}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200",
                        company === "Sheppit"
                          ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      )}
                    >
                      Sheppit
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right flex items-center justify-end gap-2">
                    <User className="h-4 w-4" />
                    Customer
                  </Label>
                  <Input
                    className="col-span-3 dark:bg-gray-700"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right flex items-center justify-end gap-2">
                    <Box className="h-4 w-4" />
                    Size
                  </Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    {!customSize ? (
                      <Select
                        value={size}
                        onValueChange={(value) => setSize(value)}
                      >
                        <SelectTrigger className="w-full dark:bg-gray-700">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-700">
                          {Object.values(ItemSizes).map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="dark:bg-gray-700"
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        placeholder="Enter custom size"
                      />
                    )}
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => toggleCustomInput("size")}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 dark:bg-gray-700"
                    >
                      {customSize ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Pencil className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right flex items-center justify-end gap-2">
                    <Palette className="h-4 w-4" />
                    Design
                  </Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    {!customDesign ? (
                      <Select
                        value={design}
                        onValueChange={(value) => setDesign(value)}
                      >
                        <SelectTrigger className="w-full dark:bg-gray-700">
                          <SelectValue placeholder="Select design" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-700">
                          {Object.values(ItemDesigns).map((design) => (
                            <SelectItem key={design} value={design}>
                              {design}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="dark:bg-gray-700"
                        value={design}
                        onChange={(e) => setDesign(e.target.value)}
                        placeholder="Enter custom design"
                      />
                    )}
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => toggleCustomInput("design")}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 dark:bg-gray-700"
                    >
                      {customDesign ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Pencil className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right flex items-center justify-end gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Vertical
                  </Label>
                  <Switch
                    checked={vertical}
                    onCheckedChange={setVertical}
                    className="col-span-3 dark:bg-gray-700"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right flex items-center justify-end gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Due Date
                  </Label>
                  <div className="col-span-3">
                    <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal dark:bg-gray-700",
                            !dueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="right"
                        align="start"
                        sideOffset={12}
                        className="w-auto p-0"
                      >
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={(date) => {
                            setDueDate(date);
                            setShowCalendar(false);
                          }}
                          defaultMonth={startOfMonth(new Date())}
                          fromMonth={startOfMonth(new Date())}
                          toMonth={startOfMonth(addMonths(new Date(), 1))}
                          disabled={{
                            before: new Date(),
                            after: endOfMonth(addMonths(new Date(), 1)),
                          }}
                          numberOfMonths={2}
                          className="rounded-md border"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </motion.div>

            </div>

            <DialogFooter className="sticky bottom-0 bg-white dark:bg-gray-800 z-10 px-6 py-4 border-t">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "w-full py-2 px-4 rounded-lg text-white font-medium",
                  "bg-blue-600 hover:bg-blue-700 transition-colors",
                  "flex items-center justify-center gap-2"
                )}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <RotateCw className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Create Item
                  </>
                )}
              </motion.button>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
};
