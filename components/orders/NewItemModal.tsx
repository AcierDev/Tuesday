import React, { useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  User,
  Box,
  Palette,
  CalendarDays,
  RotateCw,
  CheckCircle,
  ArrowUpDown,
  Settings2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { boardConfig } from "@/config/boardconfig";
import { cn } from "@/utils/functions";

import {
  ColumnTitles,
  ColumnTypes,
  ItemDesigns,
  ItemSizes,
  ItemStatus,
  Board,
  Item,
} from "../../typings/types";

type OptionalFields = {
  [K in ColumnTitles]: string;
};

type CustomInputs = {
  [K in ColumnTitles]?: boolean;
};

interface NewItemModalProps {
  board: Board | null;
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
  board,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [size, setSize] = useState("");
  const [design, setDesign] = useState("");
  const [vertical, setVertical] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [customInputs, setCustomInputs] = useState<CustomInputs>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customSize, setCustomSize] = useState(false);
  const [customDesign, setCustomDesign] = useState(false);

  const [optionalFields, setOptionalFields] = useState<OptionalFields>(() => {
    const fields = {} as OptionalFields;
    Object.values(ColumnTitles).forEach((title) => {
      fields[title] = "";
    });
    return fields;
  });

  const handleOptionalFieldChange = (
    columnName: ColumnTitles,
    value: string
  ) => {
    setOptionalFields((prev) => ({
      ...prev,
      [columnName]: value,
    }));
  };

  const toggleCustomInput = (field: "size" | "design" | ColumnTitles) => {
    if (field === "size") {
      setCustomSize(!customSize);
      if (customSize) setSize("");
    } else if (field === "design") {
      setCustomDesign(!customDesign);
      if (customDesign) setDesign("");
    } else {
      setCustomInputs((prev) => ({
        ...prev,
        [field]: !prev[field],
      }));
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

    const newItem = {
      values: Object.entries(ColumnTitles).map(([key, title]) => {
        let value = optionalFields[title];
        let type = boardConfig.columns[title]?.type || ColumnTypes.Text;

        if (title === ColumnTitles.Customer_Name) {
          value = customerName;
        } else if (title === ColumnTitles.Size) {
          value = size;
          type = ColumnTypes.Dropdown;
        } else if (title === ColumnTitles.Design) {
          value = design;
          type = ColumnTypes.Dropdown;
        } else if (title === ColumnTitles.Due) {
          value = dueDate ? format(dueDate, "yyyy-MM-dd") : "";
          type = ColumnTypes.Date;
        }

        return { columnName: title, type, text: value };
      }),
      status: ItemStatus.New,
      createdAt: Date.now(),
      vertical,
      visible: true,
      deleted: false,
      isScheduled: false,
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
    setCustomerName("");
    setSize("");
    setDesign("");
    setVertical(false);
    setDueDate(undefined);
    setShowOptionalFields(false);
    setShowCalendar(false);
    setCustomInputs({});
    setOptionalFields((prev) => {
      const reset = {} as OptionalFields;
      Object.values(ColumnTitles).forEach((title) => {
        reset[title] = "";
      });
      return reset;
    });
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
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal dark:bg-gray-700",
                        !dueDate && "text-muted-foreground"
                      )}
                      onClick={() => setShowCalendar(!showCalendar)}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Select date"}
                    </Button>
                  </div>
                </div>

                <AnimatePresence>
                  {showCalendar && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={(date) => {
                          setDueDate(date);
                          setShowCalendar(false);
                        }}
                        className="rounded-md border"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.button
                className="w-full py-2 px-4 rounded-lg border dark:border-gray-700 flex items-center justify-center gap-2"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Settings2 className="h-4 w-4" />
                {showOptionalFields
                  ? "Hide Optional Fields"
                  : "Show Optional Fields"}
                {showOptionalFields ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </motion.button>

              <AnimatePresence>
                {showOptionalFields && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {showOptionalFields ? (
                      <div className="grid gap-4 py-4">
                        {Object.values(ColumnTitles)
                          .filter(
                            (title) =>
                              ![
                                "Customer Name",
                                "Size",
                                "Design",
                                "Due Date",
                              ].includes(title)
                          )
                          .map((title) => {
                            const column = boardConfig.columns[title];
                            if (
                              column.type === ColumnTypes.Dropdown &&
                              column.options
                            ) {
                              return (
                                <div
                                  key={title}
                                  className="grid grid-cols-4 items-center gap-4"
                                >
                                  <Label className="text-right" htmlFor={title}>
                                    {title}
                                  </Label>
                                  {!customInputs[title] ? (
                                    <div className="col-span-3 flex items-center space-x-2">
                                      <Select
                                        value={optionalFields[title]}
                                        onValueChange={(value) =>
                                          handleOptionalFieldChange(
                                            title,
                                            value
                                          )
                                        }
                                      >
                                        <SelectTrigger className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                                          <SelectValue
                                            placeholder={`Select ${title}`}
                                          />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                                          {column.options.map((option) => (
                                            <SelectItem
                                              key={option}
                                              value={option}
                                            >
                                              {option}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => toggleCustomInput(title)}
                                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 dark:bg-gray-700"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="col-span-3 flex items-center space-x-2">
                                      <Input
                                        placeholder={`Enter custom ${title.toLowerCase()}`}
                                        value={optionalFields[title]}
                                        onChange={(e) =>
                                          handleOptionalFieldChange(
                                            title,
                                            e.target.value
                                          )
                                        }
                                        className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                      />
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => toggleCustomInput(title)}
                                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div
                                key={title}
                                className="grid grid-cols-4 items-center gap-4"
                              >
                                <Label className="text-right" htmlFor={title}>
                                  {title}
                                </Label>
                                <Input
                                  className="col-span-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  id={title}
                                  value={optionalFields[title]}
                                  onChange={(e) =>
                                    handleOptionalFieldChange(
                                      title,
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            );
                          })}
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
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
