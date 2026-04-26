"use client";

import { motion } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  SETTINGS_SLIDER_CLASSES,
  useSliderDraft,
} from "@/components/settings/settingsSlider";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 💊 PILL + SLIDER STYLES                                               ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
const PILL_CLASSES =
  "inline-flex h-7 min-w-[3.25rem] items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm";

const PILL_MUTED_CLASSES =
  "inline-flex h-7 min-w-[3.25rem] items-center justify-center rounded-full bg-muted px-4 text-xs font-semibold text-muted-foreground shadow-sm";

const PILL_LARGE_CLASSES =
  "inline-flex h-8 min-w-[3.5rem] items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm";

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0 },
};

interface SliderSettingPopoverProps {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Forwarded to mouse-leave on the navbar wrapper so the menu doesn't fade out while a popover is open. */
  onOpenChange?: (open: boolean) => void;
  /** Optional on/off toggle. When provided and `enabled === false`, the slider hides and the pill reads "Off". */
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  offDescription?: string;
}

export const SliderSettingPopover = ({
  label,
  description,
  icon: Icon,
  value,
  min,
  max,
  step = 1,
  onChange,
  onOpenChange,
  enabled,
  onEnabledChange,
  offDescription,
}: SliderSettingPopoverProps) => {
  const isToggleable = typeof enabled === "boolean";
  const isOff = isToggleable && !enabled;
  const { draft, handleValueChange, handleValueCommit } = useSliderDraft(
    value,
    onChange
  );

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <motion.button
          variants={ITEM_VARIANTS}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="group flex items-center w-full px-3 py-2.5 text-sm text-foreground bg-gray-900/50 backdrop-blur-md backdrop-saturate-150 border border-white/15 rounded-lg shadow-lg hover:bg-gray-900/80 hover:border-white/30 hover:text-primary transition text-left"
        >
          <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="flex-1">{label}</span>
          <span className={isOff ? PILL_MUTED_CLASSES : PILL_CLASSES}>
            {isOff ? "Off" : draft}
          </span>
        </motion.button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={10}
        className="w-80 border-white/15 bg-gray-900/95 backdrop-blur-md text-foreground shadow-xl"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center text-sm font-semibold">
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </div>
            <div className="flex items-center gap-2">
              {isToggleable && (
                <Switch
                  checked={!!enabled}
                  onCheckedChange={onEnabledChange}
                />
              )}
              {!isOff && <span className={PILL_LARGE_CLASSES}>{draft}</span>}
            </div>
          </div>
          {!isOff && (
            <Slider
              className={SETTINGS_SLIDER_CLASSES}
              min={min}
              max={max}
              step={step}
              value={[draft]}
              onValueChange={handleValueChange}
              onValueCommit={handleValueCommit}
            />
          )}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isOff && offDescription ? offDescription : description}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
