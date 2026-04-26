"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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


// After the current page settles, warm up the other page's bundle and run its
// module-level side effects (e.g. WeeklyScheduleStore auto-init firing
// fetchSchedules) so toggling feels instant instead of triggering a cold load.
const PREWARM_DELAY_MS = 300;

// The pill spring (stiffness 480, damping 36) visually settles in ~220ms.
// Defer the route change behind that window so navigation work — which
// can block the main thread on slower machines — doesn't chop the
// in-flight animation. The local activeValue update fires immediately,
// so the user gets instant visual feedback regardless.
const NAVIGATE_AFTER_ANIMATION_MS = 220;

interface PageToggleProps {
  currentPage: PageToggleValue;
}

export function PageToggle({ currentPage }: PageToggleProps) {
  const router = useRouter();
  const [activeValue, setActiveValue] = useState<PageToggleValue>(currentPage);
  const [, startTransition] = useTransition();
  const navTimeoutRef = useRef<number | null>(null);

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

  useEffect(() => {
    return () => {
      if (navTimeoutRef.current !== null) {
        window.clearTimeout(navTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ToggleGroup
      type="single"
      value={activeValue}
      onValueChange={(value) => {
        if (!value) return;
        const next = value as PageToggleValue;
        if (next === activeValue) return;
        setActiveValue(next);
        if (navTimeoutRef.current !== null) {
          window.clearTimeout(navTimeoutRef.current);
        }
        navTimeoutRef.current = window.setTimeout(() => {
          navTimeoutRef.current = null;
          startTransition(() => {
            router.push(PAGE_TOGGLE_HREF[next]);
          });
        }, NAVIGATE_AFTER_ANIMATION_MS);
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
