"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const PAGE_TOGGLE_VALUES = ["orders", "planner"] as const;
type PageToggleValue = (typeof PAGE_TOGGLE_VALUES)[number];

const PAGE_TOGGLE_HREF: Record<PageToggleValue, string> = {
  orders: "/orders",
  planner: "/production-planning",
};
const PAGE_TOGGLE_LABEL: Record<PageToggleValue, string> = {
  orders: "Orders",
  planner: "Planner",
};

// Delay router.push until the slide animation has had time to play. Tuned to
// feel snappy without truncating the spring.
const NAV_DELAY_MS = 220;

interface PageToggleProps {
  currentPage: PageToggleValue;
}

export function PageToggle({ currentPage }: PageToggleProps) {
  const router = useRouter();
  const [activeValue, setActiveValue] = useState<PageToggleValue>(currentPage);

  return (
    <ToggleGroup
      type="single"
      value={activeValue}
      onValueChange={(value) => {
        if (!value) return;
        const next = value as PageToggleValue;
        if (next === activeValue) return;
        setActiveValue(next);
        window.setTimeout(() => router.push(PAGE_TOGGLE_HREF[next]), NAV_DELAY_MS);
      }}
      className="inline-flex flex-wrap justify-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800/60 p-1 ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/60"
    >
      {PAGE_TOGGLE_VALUES.map((value) => {
        const isActive = activeValue === value;
        return (
          <ToggleGroupItem
            key={value}
            value={value}
            aria-label={`Go to ${PAGE_TOGGLE_LABEL[value]} page`}
            className="relative h-8 px-4 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-gray-200 hover:bg-transparent data-[state=on]:bg-transparent data-[state=on]:shadow-none data-[state=on]:text-gray-900 dark:data-[state=on]:text-white"
          >
            {isActive && (
              <motion.span
                layoutId="page-toggle-pill"
                className="absolute inset-0 bg-white dark:bg-gray-700 rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
              />
            )}
            <span className="relative z-10">{PAGE_TOGGLE_LABEL[value]}</span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
