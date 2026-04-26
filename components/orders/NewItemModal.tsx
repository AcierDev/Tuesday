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
  Plus,
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
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

const COMPANIES = ["Everwood", "Woodform", "Sheppit"] as const;
type Company = (typeof COMPANIES)[number];

const SuccessAnimation = () => (
  <motion.div
    className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <motion.div
      className="bg-green-500 text-white rounded-full p-4 shadow-lg shadow-green-500/40"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: [0, 1.2, 1], rotate: 0 }}
      exit={{ scale: 0, rotate: 180 }}
      transition={{ duration: 0.5 }}
    >
      <CheckCircle className="w-16 h-16" />
    </motion.div>
  </motion.div>
);

interface FieldProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ icon, label, children }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
      {icon}
      {label}
    </div>
    {children}
  </div>
);

export const NewItemModal: React.FC<NewItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [company, setCompany] = useState<Company>("Everwood");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, size, design }),
      });
      if (!response.ok) throw new Error("Failed to send notification");
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
        <DialogContent
          className="sm:max-w-[460px] max-h-[88vh] overflow-y-auto p-0 gap-0 border-gray-200/80 dark:border-gray-800 rounded-2xl bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-xl [&>button]:hidden"
        >
          {/*╔═══╗ ═════════════════════════════════════════════ ╔═══╗
              ║ 🎨 HEADER                                       ║
              ╚═══╝ ═════════════════════════════════════════════ ╚═══╝*/}
          <div className="sticky top-0 z-10 px-6 py-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 rounded-t-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-7 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
                <DialogTitle className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                  New Order
                </DialogTitle>
              </div>
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.08, rotate: 180 }}
                  whileTap={{ scale: 0.92 }}
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={resetForm}
                  aria-label="Reset form"
                >
                  <RotateCw className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
            </div>
          </div>

          {/*╔═══╗ ═════════════════════════════════════════════ ╔═══╗
              ║ 📋 BODY                                          ║
              ╚═══╝ ═════════════════════════════════════════════ ╚═══╝*/}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="px-6 py-5 space-y-5"
          >
            <Field icon={<Building2 className="h-3.5 w-3.5" />} label="Company">
              <div className="inline-flex w-full gap-1 rounded-full bg-gray-100 dark:bg-gray-800/60 p-1 ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/60">
                {COMPANIES.map((c) => {
                  const isActive = company === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCompany(c)}
                      className={cn(
                        "relative flex-1 h-8 px-3 rounded-full text-sm font-medium transition-colors",
                        isActive
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="company-toggle-pill"
                          className="absolute inset-0 bg-white dark:bg-gray-700 rounded-full shadow-sm"
                          transition={{ type: "spring", stiffness: 480, damping: 36 }}
                        />
                      )}
                      <span className="relative z-10">{c}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field icon={<User className="h-3.5 w-3.5" />} label="Customer">
              <Input
                className="h-10 rounded-lg bg-white dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-50 placeholder:text-gray-400 dark:placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 focus-visible:bg-white dark:focus-visible:bg-gray-700 dark:focus-visible:border-blue-400 transition-colors"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
              />
            </Field>

            <Field icon={<Box className="h-3.5 w-3.5" />} label="Size">
              <div className="flex items-center gap-2">
                {!customSize ? (
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger className="h-10 rounded-lg bg-white dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-50">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800">
                      {Object.values(ItemSizes).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="h-10 rounded-lg bg-white dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-50 placeholder:text-gray-400 dark:placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="Enter custom size"
                  />
                )}
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => toggleCustomInput("size")}
                  className="h-10 w-10 shrink-0 rounded-lg border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/70 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                  aria-label={customSize ? "Use preset sizes" : "Enter custom size"}
                >
                  {customSize ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </Button>
              </div>
            </Field>

            <Field icon={<Palette className="h-3.5 w-3.5" />} label="Design">
              <div className="flex items-center gap-2">
                {!customDesign ? (
                  <Select value={design} onValueChange={setDesign}>
                    <SelectTrigger className="h-10 rounded-lg bg-white dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-50">
                      <SelectValue placeholder="Select design" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800">
                      {Object.values(ItemDesigns).map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="h-10 rounded-lg bg-white dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-50 placeholder:text-gray-400 dark:placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500"
                    value={design}
                    onChange={(e) => setDesign(e.target.value)}
                    placeholder="Enter custom design"
                  />
                )}
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => toggleCustomInput("design")}
                  className="h-10 w-10 shrink-0 rounded-lg border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/70 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                  aria-label={customDesign ? "Use preset designs" : "Enter custom design"}
                >
                  {customDesign ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </Button>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field icon={<ArrowUpDown className="h-3.5 w-3.5" />} label="Vertical">
                <button
                  type="button"
                  onClick={() => setVertical(!vertical)}
                  className={cn(
                    "h-10 w-full px-3 rounded-lg border flex items-center justify-between transition-colors",
                    vertical
                      ? "bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/40"
                      : "bg-white dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-medium",
                      vertical
                        ? "text-blue-700 dark:text-blue-200"
                        : "text-gray-700 dark:text-gray-200"
                    )}
                  >
                    {vertical ? "Yes" : "No"}
                  </span>
                  <Switch checked={vertical} onCheckedChange={setVertical} />
                </button>
              </Field>

              <Field icon={<CalendarDays className="h-3.5 w-3.5" />} label="Due Date">
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-10 w-full justify-start text-left font-normal rounded-lg bg-white dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-50 hover:bg-gray-50 dark:hover:bg-gray-700",
                        !dueDate && "text-gray-500 dark:text-gray-300"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {dueDate ? format(dueDate, "MMM d, yyyy") : "Select date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="end"
                    sideOffset={8}
                    className="w-auto p-0 rounded-xl border-gray-200/80 dark:border-gray-800 shadow-lg"
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
                      className="rounded-xl"
                    />
                  </PopoverContent>
                </Popover>
              </Field>
            </div>
          </motion.div>

          {/*╔═══╗ ═════════════════════════════════════════════ ╔═══╗
              ║ 🚀 FOOTER                                        ║
              ╚═══╝ ═════════════════════════════════════════════ ╚═══╝*/}
          <div className="sticky bottom-0 z-10 px-6 py-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-800 rounded-b-2xl">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                "group h-11 w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium",
                "shadow-sm shadow-blue-600/20 transition-all duration-200 ease-out",
                "hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-600/30 active:translate-y-0",
                "dark:bg-blue-600 dark:hover:bg-blue-500",
                "flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              )}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <RotateCw className="h-4 w-4" />
                  </motion.div>
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Order
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
