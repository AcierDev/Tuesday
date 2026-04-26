"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

// Mirrors the planner's week-toggle slide+fade so toggling between Orders and
// Planner feels like the same kind of horizontal swap. template.tsx remounts
// on every navigation, so the motion.div replays its initial → animate
// transition each time. Direction is keyed off the destination: Orders sits
// on the left of the toggle, Planner on the right, so each enters from its
// own side. Anything else fades.

const SLIDE_OFFSET = 60;

const ENTER_OFFSET_BY_PATH: Record<string, number> = {
  "/orders": -SLIDE_OFFSET,
  "/production-planning": SLIDE_OFFSET,
};

const TRANSITION_DURATION_S = 0.28;
const TRANSITION_EASE = [0.32, 0.72, 0, 1] as const;

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const offset = ENTER_OFFSET_BY_PATH[pathname] ?? 0;

  return (
    <motion.div
      initial={{ x: offset, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: TRANSITION_DURATION_S, ease: TRANSITION_EASE }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
}
