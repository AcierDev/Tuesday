"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { addMonths, endOfMonth, format, startOfMonth, parseISO, isValid } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  X,
  User,
  Columns3,
  Palette,
  CalendarDays,
  RotateCw,
  CheckCircle,
  ArrowUpDown,
  Building2,
  Plus,
  Save,
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
import { Switch } from "@/components/ui/switch";
import { OrderShippingFields } from "./OrderShippingFields";
import type { ShippingDetails, EtsyOrderLink } from "@/typings/types";
import { cn } from "@/utils/functions";
import { boardConfig } from "@/config/boardconfig";
import {
  createDesignBackground,
  CUSTOM_DESIGN_GRADIENT,
  DESIGN_PILL_FULL,
  DESIGN_TAG_ALPHA,
  PILL_INTERACTIVE,
  PILL_SELECTED_RING,
  SizePillContent,
  sizePillFullClass,
  sizeToneClass,
} from "@/components/ui/order-pills";

import {
  ColumnTitles,
  ItemStatus,
  Item,
} from "../../typings/types";
import {
  customOptionHint,
  normalizeCustomOption,
} from "./utils/customOption";
import { buildOrderEditChanges } from "./utils/orderEdit";

interface OrderFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  // Create: the full new order. Edit: only the fields the user changed.
  onSubmit: (order: Partial<Item>) => Promise<void>;
  initialItem?: Item;
}

const SUCCESS_DISPLAY_MS = 1000;
const COMPANY_PREFIX = { Everwood: "", Woodform: "[WF] ", Sheppit: "[SH] " } as const;

const COMPANIES = ["Everwood", "Woodform", "Sheppit"] as const;
type Company = (typeof COMPANIES)[number];

const TRIGGER_BASE_CLASSES =
  "relative h-10 px-4 inline-flex items-center justify-start text-left text-sm font-normal border transition-colors duration-300";

const TRIGGER_EMPTY_CLASSES =
  "w-full rounded-lg border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/70 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700";

const SIZE_FILLED_TRIGGER_GEOM =
  "h-[34px] px-3.5 gap-1.5 text-[13px] w-fit rounded-full justify-center text-center border-transparent";

const DESIGN_FILLED_TRIGGER_CLASSES =
  "h-[34px] px-3.5 text-[13px] w-fit rounded-full justify-center text-center border-transparent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.05)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_24%)]";

const WOODFORM_DESIGNS = new Set(["Mint", "Brisket", "Nevada"]);

const parseHeight = (size: string): number | null => {
  const m = size.match(/x\s*(\d+)/i);
  return m ? parseInt(m[1]!, 10) : null;
};

const groupByHeight = (opts: string[]) => {
  const map = new Map<string, string[]>();
  const noHeight: string[] = [];
  for (const o of opts) {
    const h = parseHeight(o);
    if (h === null) {
      noHeight.push(o);
      continue;
    }
    const key = String(h);
    const arr = map.get(key) ?? [];
    arr.push(o);
    map.set(key, arr);
  }
  const ordered = [...map.entries()].sort(
    (a, b) => parseInt(a[0], 10) - parseInt(b[0], 10)
  );
  return { ordered, noHeight };
};

const splitByCompany = (opts: string[]) => {
  const woodform: string[] = [];
  const everwood: string[] = [];
  const striped: string[] = [];
  for (const o of opts) {
    if (WOODFORM_DESIGNS.has(o)) woodform.push(o);
    else if (o.toLowerCase().startsWith("striped ")) striped.push(o);
    else everwood.push(o);
  }
  return { woodform, everwood, striped };
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[0.625rem] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 px-0.5">
    {children}
  </div>
);

const SizeSection = ({
  label,
  options,
  selected,
  onPick,
}: {
  label: string;
  options: string[];
  selected?: string;
  onPick: (value: string) => void;
}) => (
  <div>
    <SectionLabel>{label}</SectionLabel>
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onPick(option)}
          className={`${sizePillFullClass(option)} ${PILL_INTERACTIVE} ${
            option === selected ? PILL_SELECTED_RING : ""
          }`}
        >
          <SizePillContent size={option} />
        </button>
      ))}
    </div>
  </div>
);

const DesignSection = ({
  label,
  options,
  selected,
  onPick,
}: {
  label: string;
  options: string[];
  selected?: string;
  onPick: (value: string) => void;
}) => (
  <div>
    <SectionLabel>{label}</SectionLabel>
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onPick(option)}
          className={`${DESIGN_PILL_FULL} ${PILL_INTERACTIVE} ${
            option === selected ? PILL_SELECTED_RING : ""
          }`}
          style={{
            background: createDesignBackground(option),
          }}
        >
          {option}
        </button>
      ))}
    </div>
  </div>
);

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

// Shared by NewItemModal and EditItemDialog. Change order fields and layout here
// so creating and editing orders always use the same controls.
export const OrderFormDialog: React.FC<OrderFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialItem,
}) => {
  const isEditing = Boolean(initialItem);
  const companyLayoutId = useId();
  const initialCompany: Company = initialItem?.customerName?.startsWith("[WF] ")
    ? "Woodform"
    : initialItem?.customerName?.startsWith("[SH] ") ? "Sheppit" : "Everwood";
  const initialName = (initialItem?.customerName ?? "").slice(COMPANY_PREFIX[initialCompany].length);
  const parsedDueDate = initialItem?.dueDate ? parseISO(initialItem.dueDate) : undefined;
  const initialDueDate = parsedDueDate && isValid(parsedDueDate) ? parsedDueDate : undefined;
  const [company, setCompany] = useState<Company>(initialCompany);
  const [customerName, setCustomerName] = useState(initialName);
  const [size, setSize] = useState(initialItem?.size ?? "");
  const [design, setDesign] = useState(initialItem?.design ?? "");
  const [vertical, setVertical] = useState(initialItem?.tags?.isVertical ?? false);
  const [dueDate, setDueDate] = useState<Date | undefined>(initialDueDate);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shippingPatch, setShippingPatch] = useState<Partial<ShippingDetails>>({});
  const [etsyPatch, setEtsyPatch] = useState<EtsyOrderLink>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  // Synchronous guard: blocks a second submit before React re-renders, and
  // stays held through the success animation until the dialog closes.
  const submitLockRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  // A reopened dialog starts fresh even if a success close was still pending.
  useEffect(() => {
    if (!isOpen) return;
    clearCloseTimer();
    setShowSuccess(false);
    submitLockRef.current = false;
  }, [isOpen, clearCloseTimer]);

  const isBusy = isSubmitting || showSuccess;
  const isDirty =
    company !== initialCompany ||
    customerName !== initialName ||
    size !== (initialItem?.size ?? "") ||
    design !== (initialItem?.design ?? "") ||
    vertical !== (initialItem?.tags?.isVertical ?? false) ||
    (dueDate?.getTime() ?? null) !== (initialDueDate?.getTime() ?? null) ||
    Object.keys(shippingPatch).length > 0 ||
    Object.keys(etsyPatch).length > 0;

  const [sizeOpen, setSizeOpen] = useState(false);
  const [sizeQuery, setSizeQuery] = useState("");
  const sizeInputRef = useRef<HTMLInputElement | null>(null);

  const [designOpen, setDesignOpen] = useState(false);
  const [designQuery, setDesignQuery] = useState("");
  const designInputRef = useRef<HTMLInputElement | null>(null);

  const sizeOptions = boardConfig.columns[ColumnTitles.Size].options ?? [];
  const designOptions =
    boardConfig.columns[ColumnTitles.Design].options ?? [];

  const sizeFiltered = useMemo(() => {
    const q = sizeQuery.trim().toLowerCase();
    if (!q) return sizeOptions;
    return sizeOptions.filter((o) => o.toLowerCase().includes(q));
  }, [sizeOptions, sizeQuery]);

  const sizeGrouped = useMemo(() => groupByHeight(sizeFiltered), [sizeFiltered]);

  const sizeTrimmed = normalizeCustomOption(sizeQuery) ?? "";
  const sizeHint = customOptionHint(sizeQuery);
  const sizeExact = sizeOptions.some(
    (o) => o.toLowerCase() === sizeTrimmed.toLowerCase()
  );
  const showCustomSize = sizeTrimmed.length > 0 && !sizeExact;

  const designFiltered = useMemo(() => {
    const q = designQuery.trim().toLowerCase();
    if (!q) return designOptions;
    return designOptions.filter((o) => o.toLowerCase().includes(q));
  }, [designOptions, designQuery]);

  const designGrouped = useMemo(
    () => splitByCompany(designFiltered),
    [designFiltered]
  );

  const designTrimmed = normalizeCustomOption(designQuery) ?? "";
  const designHint = customOptionHint(designQuery);
  const designExact = designOptions.some(
    (o) => o.toLowerCase() === designTrimmed.toLowerCase()
  );
  const showCustomDesign = designTrimmed.length > 0 && !designExact;

  const handlePickSize = (value: string) => {
    setSize(value);
    setSizeQuery("");
    setSizeOpen(false);
  };

  const handlePickDesign = (value: string) => {
    setDesign(value);
    setDesignQuery("");
    setDesignOpen(false);
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
    if (submitLockRef.current) return;
    const trimmedName = customerName.trim();
    const missing = [
      !trimmedName && "customer",
      !size && "size",
      !design && "design",
      !dueDate && "due date",
    ].filter(Boolean);
    if (missing.length > 0 || !dueDate) {
      setFormError(`Missing ${missing.join(", ")}`);
      return;
    }

    const values = {
      customerName: `${COMPANY_PREFIX[company]}${trimmedName}`,
      size,
      design,
      dueDate: format(dueDate, "yyyy-MM-dd"),
      isVertical: vertical,
    };
    const order: Partial<Item> = initialItem
      ? buildOrderEditChanges(initialItem, values)
      : {
          status: ItemStatus.New,
          createdAt: Date.now(),
          visible: true,
          deleted: false,
          isScheduled: false,
          customerName: values.customerName,
          size,
          design,
          dueDate: values.dueDate,
          tags: { isVertical: vertical },
        };
    // Send only explicitly edited keys so partial corrections retain saved manual fields.
    if (Object.keys(shippingPatch).length) order.shippingDetails = shippingPatch as ShippingDetails;
    if (Object.keys(etsyPatch).length) order.etsyOrder = etsyPatch;
    // Nothing edited: nothing to save.
    if (initialItem && Object.keys(order).length === 0) {
      onClose();
      return;
    }

    submitLockRef.current = true;
    setFormError(null);
    setConfirmingDiscard(false);
    setIsSubmitting(true);

    try {
      await onSubmit(order);
    } catch (error) {
      console.error("Error saving order:", error);
      submitLockRef.current = false;
      setFormError(
        isEditing
          ? "Couldn't save the order. Your changes are still here; try again."
          : "Couldn't create the order. Your changes are still here; try again."
      );
      return;
    } finally {
      setIsSubmitting(false);
    }

    if (isEditing) {
      onClose();
      return;
    }
    // Only a confirmed create reaches here, so the team is never told about
    // an order that failed to save.
    await sendNotification(trimmedName, size, design);
    setShowSuccess(true);
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setShowSuccess(false);
      onClose();
      resetForm();
    }, SUCCESS_DISPLAY_MS);
  };

  // Outside click / Esc: ask before throwing away edits. A second dismiss
  // while asking discards.
  const handleOpenChange = (open: boolean) => {
    if (open || isBusy) return;
    if (isDirty && !confirmingDiscard) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  };

  const resetForm = () => {
    setCompany(initialCompany);
    setCustomerName(initialName);
    setSize(initialItem?.size ?? "");
    setDesign(initialItem?.design ?? "");
    setVertical(initialItem?.tags?.isVertical ?? false);
    setDueDate(initialDueDate);
    setShowCalendar(false);
    setSizeOpen(false);
    setSizeQuery("");
    setDesignOpen(false);
    setDesignQuery("");
    setIsSubmitting(false);
    setFormError(null);
    setConfirmingDiscard(false);
    submitLockRef.current = false;
    setShippingPatch({});
    setEtsyPatch({});
  };

  return (
    <>
      <AnimatePresence>{showSuccess && <SuccessAnimation />}</AnimatePresence>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
                  {isEditing ? "Edit Order" : "New Order"}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.08, rotate: 180 }}
                  whileTap={{ scale: 0.92 }}
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={resetForm}
                  disabled={isBusy}
                  aria-label="Reset form"
                >
                  <RotateCw className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={onClose}
                  disabled={isBusy}
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
                          layoutId={companyLayoutId}
                          className="absolute inset-0 pointer-events-none"
                          transition={{ type: "spring", stiffness: 480, damping: 36 }}
                        >
                          <span className="absolute inset-0 bg-white dark:bg-gray-700 rounded-full shadow-sm animate-pill-squish" />
                        </motion.span>
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

            <Field icon={<Columns3 className="h-3.5 w-3.5" />} label="Size">
              <Popover open={sizeOpen} onOpenChange={setSizeOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      TRIGGER_BASE_CLASSES,
                      size
                        ? `${SIZE_FILLED_TRIGGER_GEOM} ${sizeToneClass(size)}`
                        : TRIGGER_EMPTY_CLASSES
                    )}
                  >
                    {size ? (
                      <SizePillContent size={size} />
                    ) : (
                      <span>Select size</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  sideOffset={6}
                  className="w-80 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl"
                  onOpenAutoFocus={(e) => {
                    e.preventDefault();
                    sizeInputRef.current?.focus();
                  }}
                >
                  <input
                    ref={sizeInputRef}
                    value={sizeQuery}
                    onChange={(e) => setSizeQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (showCustomSize) handlePickSize(sizeTrimmed);
                        else if (sizeFiltered[0]) handlePickSize(sizeFiltered[0]);
                      }
                    }}
                    placeholder="Search or type a custom size"
                    className="w-full mb-3 px-3 h-8 rounded-md text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <div className="px-1 pt-1.5 pb-1 space-y-3">
                    {sizeGrouped.ordered.map(([height, sizes]) => (
                      <SizeSection
                        key={height}
                        label={`${height} Tall`}
                        options={sizes}
                        selected={size}
                        onPick={handlePickSize}
                      />
                    ))}
                    {sizeGrouped.noHeight.length > 0 && (
                      <SizeSection
                        label="Other"
                        options={sizeGrouped.noHeight}
                        selected={size}
                        onPick={handlePickSize}
                      />
                    )}
                    {showCustomSize && (
                      <div>
                        <SectionLabel>Custom</SectionLabel>
                        <button
                          type="button"
                          onClick={() => handlePickSize(sizeTrimmed)}
                          className={`${sizePillFullClass(sizeTrimmed)} ${PILL_INTERACTIVE}`}
                        >
                          <SizePillContent size={sizeTrimmed} />
                        </button>
                      </div>
                    )}
                    {sizeHint && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 py-1 px-1">
                        {sizeHint}
                      </p>
                    )}
                    {sizeFiltered.length === 0 && !showCustomSize && !sizeHint && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 py-1 px-1">
                        No matches.
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </Field>

            <Field icon={<Palette className="h-3.5 w-3.5" />} label="Design">
              <Popover open={designOpen} onOpenChange={setDesignOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      TRIGGER_BASE_CLASSES,
                      design
                        ? DESIGN_FILLED_TRIGGER_CLASSES
                        : TRIGGER_EMPTY_CLASSES
                    )}
                    style={
                      design
                        ? {
                            background: createDesignBackground(
                              design,
                              DESIGN_TAG_ALPHA
                            ),
                          }
                        : undefined
                    }
                  >
                    <span>{design || "Select design"}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  sideOffset={6}
                  className="w-80 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl"
                  onOpenAutoFocus={(e) => {
                    e.preventDefault();
                    designInputRef.current?.focus();
                  }}
                >
                  <input
                    ref={designInputRef}
                    value={designQuery}
                    onChange={(e) => setDesignQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (showCustomDesign) handlePickDesign(designTrimmed);
                        else if (designFiltered[0]) handlePickDesign(designFiltered[0]);
                      }
                    }}
                    placeholder="Search or type a custom design"
                    className="w-full mb-3 px-3 h-8 rounded-md text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <div className="px-1 pt-1.5 pb-1 space-y-3">
                    {designGrouped.everwood.length > 0 && (
                      <DesignSection
                        label="Everwood-Geometric"
                        options={designGrouped.everwood}
                        selected={design}
                        onPick={handlePickDesign}
                      />
                    )}
                    {designGrouped.striped.length > 0 && (
                      <DesignSection
                        label="Everwood-Striped"
                        options={designGrouped.striped}
                        selected={design}
                        onPick={handlePickDesign}
                      />
                    )}
                    {designGrouped.woodform.length > 0 && (
                      <DesignSection
                        label="WoodForm-Geometric"
                        options={designGrouped.woodform}
                        selected={design}
                        onPick={handlePickDesign}
                      />
                    )}
                    {showCustomDesign && (
                      <div>
                        <SectionLabel>Custom</SectionLabel>
                        <button
                          type="button"
                          onClick={() => handlePickDesign(designTrimmed)}
                          className={`${DESIGN_PILL_FULL} ${PILL_INTERACTIVE}`}
                          style={{ background: CUSTOM_DESIGN_GRADIENT }}
                        >
                          Use &ldquo;{designTrimmed}&rdquo;
                        </button>
                      </div>
                    )}
                    {designHint && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 py-1 px-1">
                        {designHint}
                      </p>
                    )}
                    {designFiltered.length === 0 && !showCustomDesign && !designHint && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 py-1 px-1">
                        No matches.
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field icon={<ArrowUpDown className="h-3.5 w-3.5" />} label="Vertical">
                {/* A label (not a button) around the Switch: no nested buttons, and
                    a tap anywhere on the row toggles exactly once. */}
                <label
                  className={cn(
                    "h-10 w-full px-3 rounded-lg border flex items-center justify-between transition-colors cursor-pointer",
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
                  <Switch
                    checked={vertical}
                    onCheckedChange={setVertical}
                    aria-label="Vertical"
                  />
                </label>
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
            <details className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-gray-800 dark:text-gray-200">
                Shipping address <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                  {Object.keys(shippingPatch).length || Object.keys(etsyPatch).length ? "· Unsaved changes" : initialItem?.shippingDetails?.street1 ? "· Saved" : "· Not added"}
                </span>
              </summary>
              <div className="mt-3"><OrderShippingFields
                address={{ ...initialItem?.shippingDetails, ...shippingPatch }} etsyOrder={{ ...initialItem?.etsyOrder, ...etsyPatch }}
                disabled={isSubmitting} onAddressChange={patch => setShippingPatch(previous => ({ ...previous, ...patch }))}
                onEtsyChange={patch => setEtsyPatch(previous => ({ ...previous, ...patch }))} />
              </div>
            </details>
          </motion.div>

          {/*╔═══╗ ═════════════════════════════════════════════ ╔═══╗
              ║ 🚀 FOOTER                                        ║
              ╚═══╝ ═════════════════════════════════════════════ ╚═══╝*/}
          <div className="sticky bottom-0 z-10 px-6 py-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-800 rounded-b-2xl">
            {formError && !confirmingDiscard && (
              <p
                role="alert"
                className="mb-2 text-center text-sm text-red-600 dark:text-red-400"
              >
                {formError}
              </p>
            )}
            {confirmingDiscard ? (
              <div className="flex h-11 items-center gap-2">
                <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  Discard changes?
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmingDiscard(false)}
                  className="h-9 px-4 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 rounded-full text-sm font-semibold text-red-700 dark:text-red-300 bg-red-500/10 hover:bg-red-500/20 ring-1 ring-inset ring-red-500/30 transition-colors"
                >
                  Discard
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isBusy}
                className={cn(
                  "group h-11 w-full rounded-full bg-blue-500/40 hover:bg-blue-500/55 text-blue-800 dark:text-white text-sm font-semibold",
                  "ring-1 ring-inset ring-blue-500/50 dark:ring-blue-400/40 backdrop-blur-sm",
                  "shadow-sm shadow-blue-500/20 transition-all duration-200 ease-out",
                  "hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-500/30 active:translate-y-0",
                  "dark:bg-blue-500/30 dark:hover:bg-blue-500/45",
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
                    {isEditing ? "Saving…" : "Creating…"}
                  </>
                ) : (
                  <>
                    {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {isEditing ? "Save Changes" : "Create Order"}
                  </>
                )}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
