import { useEffect, useMemo, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { boardConfig } from "../../config/boardconfig";
import { DesignBlends } from "@/typings/constants";
import { toast } from "sonner";
import { ColumnValue, Item } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";

const DESIGN_TAG_ALPHA = 0.8;

const PILL_BASE_CLASSES =
  "inline-flex items-center justify-center px-3 h-6 min-h-0 text-xs font-medium text-white rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 transition-[transform,opacity,box-shadow] border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.05)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_24%)] hover:opacity-95 hover:-translate-y-px active:translate-y-0";

const PILL_TRIGGER_CLASSES =
  "inline-flex items-center justify-center px-1.5 sm:px-3 h-5 sm:h-6 min-h-0 max-w-full truncate text-[0.625rem] sm:text-xs font-medium text-white rounded-lg sm:rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 transition-[transform,opacity,box-shadow] border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.05)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_24%)] hover:opacity-95 hover:-translate-y-px active:translate-y-0";

const SELECTED_RING_CLASSES =
  "ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900";

const WOODFORM_DESIGNS = new Set(["Mint", "Brisket", "Nevada"]);

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

const Section = ({
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
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onPick(option)}
            className={`${PILL_BASE_CLASSES} ${
              isSelected ? SELECTED_RING_CLASSES : ""
            }`}
            style={{ background: createBackground(option) }}
          >
            {option}
          </button>
        );
      })}
    </div>
  </div>
);

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

const createBackground = (option: string, alpha = 1) => {
  const colors = DesignBlends[option as keyof typeof DesignBlends];
  if (colors && colors.length > 0) {
    const stops =
      alpha < 1 ? colors.map((c) => hexToRgba(c, alpha)) : colors;
    return `linear-gradient(to right, ${stops.join(", ")})`;
  }
  return alpha < 1 ? `rgba(0, 0, 0, ${alpha})` : "#000000";
};

export const DesignDropdownCell = ({
  item,
  columnValue,
  disabled = false,
}: {
  item: Item;
  columnValue: ColumnValue;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { updateItem } = useOrderStore();

  const options = (
    boardConfig.columns[columnValue.columnName].options ?? []
  ).filter((o) => !o.toLowerCase().startsWith("tiled "));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const grouped = useMemo(() => splitByCompany(filtered), [filtered]);

  const trimmed = query.trim();
  const exactMatch = options.some(
    (o) => o.toLowerCase() === trimmed.toLowerCase()
  );
  const showCustomOption = trimmed.length > 0 && !exactMatch;

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  const handleUpdate = async (newValue: string) => {
    setIsOpen(false);
    try {
      const updatedItem = {
        ...item,
        design: newValue,
      };
      await updateItem(updatedItem, columnValue.columnName);
      toast.success("Design updated successfully");
    } catch (err) {
      console.error("Failed to update ColumnValue", err);
      toast.error("Failed to update the design. Please try again.");
    }
  };

  const handleSubmitCustom = () => {
    if (!trimmed) return;
    handleUpdate(trimmed);
  };

  const currentDesign = columnValue.text as keyof typeof DesignBlends;
  const backgroundStyle = createBackground(currentDesign, DESIGN_TAG_ALPHA);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          className={PILL_TRIGGER_CLASSES}
          style={{ background: backgroundStyle }}
        >
          {columnValue.text || "Select Design"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-80 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (showCustomOption) {
                handleSubmitCustom();
              } else if (filtered[0]) {
                handleUpdate(filtered[0]);
              }
            }
          }}
          placeholder="Search or type a custom design"
          className="w-full mb-3 px-3 h-8 rounded-md text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <div className="px-1 pt-1.5 pb-1 space-y-3">
          {grouped.everwood.length > 0 && (
            <Section
              label="Everwood-Geometric"
              options={grouped.everwood}
              selected={columnValue.text}
              onPick={handleUpdate}
            />
          )}
          {grouped.striped.length > 0 && (
            <Section
              label="Everwood-Striped"
              options={grouped.striped}
              selected={columnValue.text}
              onPick={handleUpdate}
            />
          )}
          {grouped.woodform.length > 0 && (
            <Section
              label="WoodForm-Geometric"
              options={grouped.woodform}
              selected={columnValue.text}
              onPick={handleUpdate}
            />
          )}
          {showCustomOption && (
            <div>
              <SectionLabel>Custom</SectionLabel>
              <button
                type="button"
                onClick={handleSubmitCustom}
                className={PILL_BASE_CLASSES}
                style={{ background: "linear-gradient(to right, #4b5563, #1f2937)" }}
              >
                Use &ldquo;{trimmed}&rdquo;
              </button>
            </div>
          )}
          {filtered.length === 0 && !showCustomOption && (
            <p className="text-xs text-gray-500 dark:text-gray-400 py-1 px-1">
              No matches.
            </p>
          )}
        </div>

      </PopoverContent>
    </Popover>
  );
};
