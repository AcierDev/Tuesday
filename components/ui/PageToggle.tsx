"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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


// After the current page settles, warm up the other page's bundle and run its
// module-level side effects (e.g. WeeklyScheduleStore auto-init firing
// fetchSchedules) so toggling feels instant instead of triggering a cold load.
const PREWARM_DELAY_MS = 300;
// Pill slide is driven by a GPU-accelerated CSS transform so it stays smooth
// even while React is busy committing the destination page.
const PILL_TRANSITION = "transform 240ms cubic-bezier(0.32, 1.2, 0.55, 1)";
const PILL_GAP_PX = 4;

interface PageToggleProps {
  currentPage: PageToggleValue;
}

export function PageToggle({ currentPage }: PageToggleProps) {
  const router = useRouter();
  const [activeValue, setActiveValue] = useState<PageToggleValue>(currentPage);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const other: PageToggleValue =
      currentPage === "orders" ? "planner" : "orders";
    const handle = window.setTimeout(() => {
      router.prefetch(PAGE_TOGGLE_HREF[other]);
      if (other === "planner") {
        void import("@/app/production-planning/page");
      } else {
        void import("@/app/orders/page");
      }
    }, PREWARM_DELAY_MS);
    return () => window.clearTimeout(handle);
  }, [currentPage, router]);

  const activeIndex = PAGE_TOGGLE_VALUES.indexOf(activeValue);

  return (
    <ToggleGroup
      type="single"
      value={activeValue}
      onValueChange={(value) => {
        if (!value) return;
        const next = value as PageToggleValue;
        if (next === activeValue) return;
        setActiveValue(next);
        startTransition(() => {
          router.push(PAGE_TOGGLE_HREF[next]);
        });
      }}
      className="relative inline-grid grid-cols-2 gap-1 rounded-full bg-gray-100 dark:bg-gray-800/60 p-1 ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/60"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 rounded-full bg-white dark:bg-gray-700 shadow-sm will-change-transform"
        style={{
          left: PILL_GAP_PX,
          width: `calc((100% - ${PILL_GAP_PX * 3}px) / 2)`,
          transform:
            activeIndex === 0
              ? "translateX(0)"
              : `translateX(calc(100% + ${PILL_GAP_PX}px))`,
          transition: PILL_TRANSITION,
        }}
      />
      {PAGE_TOGGLE_VALUES.map((value) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={`Go to ${PAGE_TOGGLE_LABEL[value]} page`}
          className="relative z-10 h-8 px-4 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-gray-200 hover:bg-transparent data-[state=on]:bg-transparent data-[state=on]:shadow-none data-[state=on]:text-gray-900 dark:data-[state=on]:text-white"
        >
          {PAGE_TOGGLE_LABEL[value]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
