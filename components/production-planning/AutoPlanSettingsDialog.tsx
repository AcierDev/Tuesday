"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SliderSettingPopover } from "@/components/settings/SliderSettingPopover";
import { Hourglass, RotateCcw, Zap } from "lucide-react";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ AUTO-PLAN WEIGHT MODEL                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// Outside the urgent window, design grouping rules unchallenged. Inside, the
// pull kicks in — proportional to how much buffer the slot leaves before due.
export type AutoPlanWeights = {
  urgentWindowDays: number;
  urgentPullLevel: number; // 1-5; multiplied internally to get squares-per-day pull
};

export const AUTO_PLAN_WEIGHT_DEFAULTS: AutoPlanWeights = {
  urgentWindowDays: 3,
  urgentPullLevel: 3,
};

// 1-5 → squares-per-day pull. Default level 3 = 75 sq/day, matching the
// previous baseline. Linear ladder so each step feels like a meaningful bump.
export const URGENT_PULL_LEVEL_TO_PER_DAY = 25;

interface AutoPlanSettingsPopoverProps {
  weights: AutoPlanWeights;
  onChange: (weights: AutoPlanWeights) => void;
  children: React.ReactNode;
}

const STAGGER_PARENT = {
  hidden: { transition: { staggerChildren: 0.02, staggerDirection: 1 } },
  visible: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
      delayChildren: 0.04,
    },
  },
};

const RESET_VARIANTS = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0 },
};

export function AutoPlanSettingsPopover({
  weights,
  onChange,
  children,
}: AutoPlanSettingsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [openSliderId, setOpenSliderId] = useState<string | null>(null);
  const setSliderOpen = (id: string) => (next: boolean) =>
    setOpenSliderId(next ? id : null);

  const set = <K extends keyof AutoPlanWeights>(
    key: K,
    value: AutoPlanWeights[K]
  ) => onChange({ ...weights, [key]: value });

  const isDefaults =
    weights.urgentWindowDays === AUTO_PLAN_WEIGHT_DEFAULTS.urgentWindowDays &&
    weights.urgentPullLevel === AUTO_PLAN_WEIGHT_DEFAULTS.urgentPullLevel;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-auto border-0 bg-transparent p-0 shadow-none"
      >
        <AnimatePresence>
          {open && (
            <motion.div
              key="auto-plan-settings"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
            >
              <motion.div
                className="flex flex-col gap-2 min-w-[240px]"
                initial="hidden"
                animate="visible"
                variants={STAGGER_PARENT}
              >
                <SliderSettingPopover
                  label="Urgent window"
                  icon={Hourglass}
                  value={weights.urgentWindowDays}
                  min={1}
                  max={7}
                  onChange={(v) => set("urgentWindowDays", v)}
                  open={openSliderId === "urgent-window"}
                  onOpenChange={setSliderOpen("urgent-window")}
                  description="When urgency kicks in. Items further out than this rely purely on design grouping; items within this window get pulled toward earlier slots."
                />
                <SliderSettingPopover
                  label="Urgent pull"
                  icon={Zap}
                  value={weights.urgentPullLevel}
                  min={1}
                  max={5}
                  onChange={(v) => set("urgentPullLevel", v)}
                  open={openSliderId === "urgent-pull"}
                  onOpenChange={setSliderOpen("urgent-pull")}
                  description="How hard the pull is once an item enters the urgent window. 1 = barely nudges the schedule. 5 = aggressively pulls near-due items earlier, even at the cost of design grouping."
                />
                <motion.button
                  variants={RESET_VARIANTS}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  onClick={() => onChange(AUTO_PLAN_WEIGHT_DEFAULTS)}
                  disabled={isDefaults}
                  className="group flex items-center w-full px-3 py-2 text-xs text-foreground/80 bg-gray-900/50 backdrop-blur-md backdrop-saturate-150 border border-white/15 rounded-lg shadow-lg hover:bg-gray-900/80 hover:border-white/30 hover:text-primary transition text-left disabled:opacity-40 disabled:hover:bg-gray-900/50 disabled:hover:border-white/15 disabled:hover:text-foreground/80"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                  <span>Reset to defaults</span>
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
