import React, { useMemo, useRef, useState } from "react";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
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
import { cn } from "@/utils/functions";
import { boardConfig } from "@/config/boardconfig";
import { DesignBlends } from "@/typings/constants";

import {
  ColumnTitles,
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

const DESIGN_TAG_ALPHA = 0.8;

const SIZE_PILL_CLASSES =
  "inline-flex items-center justify-center px-3 h-6 min-h-0 text-xs font-medium text-white rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 transition-[transform,opacity,box-shadow] border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.10)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_48%)] bg-sky-500/80 dark:bg-sky-600/80 hover:opacity-95 hover:-translate-y-px active:translate-y-0";

const DESIGN_PILL_CLASSES =
  "inline-flex items-center justify-center px-3 h-6 min-h-0 text-xs font-medium text-white rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 transition-[transform,opacity,box-shadow] border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.05)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_24%)] hover:opacity-95 hover:-translate-y-px active:translate-y-0";

const SELECTED_RING_CLASSES =
  "ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900";

const TRIGGER_BASE_CLASSES =
  "relative overflow-hidden h-10 w-full justify-start text-left font-normal rounded-lg border transition-all duration-300";

const TRIGGER_EMPTY_CLASSES =
  "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/70 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700";

const SIZE_FILLED_CLASSES =
  "border-transparent text-white bg-sky-500/80 dark:bg-sky-600/80 hover:bg-sky-500/80 dark:hover:bg-sky-600/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.10)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_48%)]";

const DESIGN_FILLED_CLASSES =
  "border-transparent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.05)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_24%)]";

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

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createDesignBackground = (option: string, alpha = 1) => {
  const colors = DesignBlends[option as keyof typeof DesignBlends];
  if (colors && colors.length > 0) {
    const stops =
      alpha < 1 ? colors.map((c) => hexToRgba(c, alpha)) : colors;
    return `linear-gradient(to right, ${stops.join(", ")})`;
  }
  return null;
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
          className={`${SIZE_PILL_CLASSES} ${
            option === selected ? SELECTED_RING_CLASSES : ""
          }`}
        >
          {option}
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
          className={`${DESIGN_PILL_CLASSES} ${
            option === selected ? SELECTED_RING_CLASSES : ""
          }`}
          style={{
            background:
              createDesignBackground(option) ??
              "linear-gradient(to right, #4b5563, #1f2937)",
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

  const [sizeOpen, setSizeOpen] = useState(false);
  const [sizeQuery, setSizeQuery] = useState("");
  const sizeInputRef = useRef<HTMLInputElement | null>(null);

  const [designOpen, setDesignOpen] = useState(false);
  const [designQuery, setDesignQuery] = useState("");
  const designInputRef = useRef<HTMLInputElement | null>(null);

  const sizeOptions = boardConfig.columns[ColumnTitles.Size].options ?? [];
  const designOptions = (
    boardConfig.columns[ColumnTitles.Design].options ?? []
  ).filter((o) => !o.toLowerCase().startsWith("tiled "));

  const sizeFiltered = useMemo(() => {
    const q = sizeQuery.trim().toLowerCase();
    if (!q) return sizeOptions;
    return sizeOptions.filter((o) => o.toLowerCase().includes(q));
  }, [sizeOptions, sizeQuery]);

  const sizeGrouped = useMemo(() => groupByHeight(sizeFiltered), [sizeFiltered]);

  const sizeTrimmed = sizeQuery.trim();
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

  const designTrimmed = designQuery.trim();
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
                  <Button
                    variant="outline"
                    className={cn(
                      TRIGGER_BASE_CLASSES,
                      size ? SIZE_FILLED_CLASSES : TRIGGER_EMPTY_CLASSES
                    )}
                  >
                    <motion.span
                      key={size || "empty"}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="relative z-10"
                    >
                      {size || "Select size"}
                    </motion.span>
                  </Button>
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
                          className={SIZE_PILL_CLASSES}
                        >
                          Use &ldquo;{sizeTrimmed}&rdquo;
                        </button>
                      </div>
                    )}
                    {sizeFiltered.length === 0 && !showCustomSize && (
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
                  <Button
                    variant="outline"
                    className={cn(
                      TRIGGER_BASE_CLASSES,
                      design ? DESIGN_FILLED_CLASSES : TRIGGER_EMPTY_CLASSES
                    )}
                  >
                    <AnimatePresence>
                      {design && (
                        <motion.span
                          key={design}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: createDesignBackground(
                              design,
                              DESIGN_TAG_ALPHA
                            ) ?? undefined,
                          }}
                        />
                      )}
                    </AnimatePresence>
                    <motion.span
                      key={design || "empty"}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="relative z-10"
                    >
                      {design || "Select design"}
                    </motion.span>
                  </Button>
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
                          className={DESIGN_PILL_CLASSES}
                          style={{
                            background:
                              "linear-gradient(to right, #4b5563, #1f2937)",
                          }}
                        >
                          Use &ldquo;{designTrimmed}&rdquo;
                        </button>
                      </div>
                    )}
                    {designFiltered.length === 0 && !showCustomDesign && (
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
