import { useEffect, useMemo, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { boardConfig } from "../../config/boardconfig";
import { ColumnValue, Item } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { showErrorToast } from "@/components/ui/app-toast";
import { TOUCH_HIT_AREA } from "@/components/ui/touch-target";
import {
  customOptionHint,
  normalizeCustomOption,
} from "@/components/orders/utils/customOption";
import {
  CUSTOM_DESIGN_GRADIENT,
  DESIGN_PILL_FULL,
  DESIGN_PILL_TRIGGER,
  DESIGN_TAG_ALPHA,
  PILL_INTERACTIVE,
  PILL_SELECTED_RING,
  createDesignBackground,
} from "@/components/ui/order-pills";

const PILL_BASE_CLASSES = `${DESIGN_PILL_FULL} ${PILL_INTERACTIVE}`;
// !overflow-visible keeps the touch hit area un-clipped; the inner label span
// truncates instead.
const PILL_TRIGGER_CLASSES = `${DESIGN_PILL_TRIGGER} ${PILL_INTERACTIVE} ${TOUCH_HIT_AREA} !overflow-visible`;

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
              isSelected ? PILL_SELECTED_RING : ""
            }`}
            style={{ background: createDesignBackground(option) }}
          >
            {option}
          </button>
        );
      })}
    </div>
  </div>
);


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

  const updateItem = useOrderStore((state) => state.updateItem);

  const options = boardConfig.columns[columnValue.columnName].options ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const grouped = useMemo(() => splitByCompany(filtered), [filtered]);

  const trimmed = normalizeCustomOption(query) ?? "";
  const customHint = customOptionHint(query);
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
    } catch (err) {
      console.error("Failed to update design", err);
      showErrorToast("Couldn't save the design. Try again.");
    }
  };

  const handleSubmitCustom = () => {
    if (!trimmed) return;
    handleUpdate(trimmed);
  };

  const backgroundStyle = createDesignBackground(
    columnValue.text ?? "",
    DESIGN_TAG_ALPHA
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          className={PILL_TRIGGER_CLASSES}
          style={{ background: backgroundStyle }}
        >
          <span className="truncate">{columnValue.text || "Select Design"}</span>
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
                style={{ background: CUSTOM_DESIGN_GRADIENT }}
              >
                Use &ldquo;{trimmed}&rdquo;
              </button>
            </div>
          )}
          {customHint && (
            <p className="text-xs text-amber-600 dark:text-amber-400 py-1 px-1">
              {customHint}
            </p>
          )}
          {filtered.length === 0 && !showCustomOption && !customHint && (
            <p className="text-xs text-gray-500 dark:text-gray-400 py-1 px-1">
              No matches.
            </p>
          )}
        </div>

      </PopoverContent>
    </Popover>
  );
};
