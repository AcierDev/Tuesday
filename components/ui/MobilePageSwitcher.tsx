"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";

import { PageToggle } from "@/components/ui/PageToggle";
import { MobileGluedTodayBadge } from "@/components/ui/MobileGluedTodayBadge";
import { useOrderStore } from "@/stores/useOrderStore";

const SWITCHER_ROUTES = new Set(["/orders", "/production-planning"]);

const SEARCH_BUTTON_SIZE = 40;
const TOGGLE_SEARCH_GAP_PX = 8;
const TOGGLE_BADGE_GAP_PX = 8;
const TOGGLE_LIFT_PX = 52;
const SEARCH_SIDE_MARGIN_PX = 16;
const SEARCH_KEYBOARD_GAP_PX = 12;
const SPRING = { duration: 0.32, ease: [0.32, 1.2, 0.55, 1] as const };

export function MobilePageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const setSearchQuery = useOrderStore((s) => s.setSearchQuery);
  const searchQuery = useOrderStore((s) => s.searchQuery);
  const [searching, setSearching] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [toggleWidth, setToggleWidth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (toggleRef.current) {
      setToggleWidth(toggleRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    if (searching) inputRef.current?.focus();
  }, [searching]);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    const update = () => {
      const inset = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop,
      );
      setKeyboardOffset(inset);
      setViewportWidth(vv.width);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  const expandedSearchWidth = Math.max(
    240,
    (viewportWidth || 360) - SEARCH_SIDE_MARGIN_PX * 2,
  );

  if (!SWITCHER_ROUTES.has(pathname)) return null;

  const currentPage = pathname === "/orders" ? "orders" : "planner";

  const openSearch = () => {
    if (currentPage !== "orders") router.push("/orders");
    setSearching(true);
  };

  const closeSearch = () => {
    setSearching(false);
    setSearchQuery("");
  };

  const liftPx = searching
    ? keyboardOffset > 0
      ? keyboardOffset + SEARCH_KEYBOARD_GAP_PX
      : 0
    : 0;

  return (
    <div
      className="lg:hidden fixed bottom-3 left-0 right-0 z-50 pointer-events-none"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        transform: `translate3d(0, ${-liftPx}px, 0)`,
        transition: "transform 0.25s ease-out",
      }}
    >
      {/* Glued-today badge: anchored to screen center then shifted fully left
          of the toggle (its own width via -100%, plus half the toggle + gap).
          Fades up and out alongside the toggle when searching. The outer div
          holds the CSS transform so framer-motion's animated transform on the
          inner motion.div doesn't clobber it. */}
      <div
        className="absolute left-1/2 bottom-0"
        style={{
          transform: `translateX(calc(-100% - ${
            toggleWidth / 2 + TOGGLE_BADGE_GAP_PX
          }px))`,
        }}
      >
        <motion.div
          animate={{
            y: searching ? -TOGGLE_LIFT_PX : 0,
            opacity: searching ? 0 : 1,
            scale: searching ? 0.96 : 1,
          }}
          transition={SPRING}
          style={{ pointerEvents: searching ? "none" : "auto" }}
        >
          <MobileGluedTodayBadge />
        </motion.div>
      </div>

      {/* Toggle: anchored to screen center. Fades up and out when searching.
          Wrapper holds the -translate-x-1/2 so framer-motion's animated
          transform on the inner motion.div doesn't clobber it. */}
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
        <motion.div
          ref={toggleRef}
          animate={{
            y: searching ? -TOGGLE_LIFT_PX : 0,
            opacity: searching ? 0 : 1,
            scale: searching ? 0.96 : 1,
          }}
          transition={SPRING}
          className="rounded-full bg-gray-950/85 backdrop-blur-md ring-1 ring-white/15 shadow-lg shadow-black/30"
          style={{ pointerEvents: searching ? "none" : "auto" }}
        >
          <PageToggle currentPage={currentPage} />
        </motion.div>
      </div>

      {/* Search bar: collapsed = just to the right of the centered toggle.
          Expanded = full-width centered above the keyboard. We anchor at
          left-1/2 and bake the centering offset into x, since framer-motion's
          transform would otherwise override Tailwind's -translate-x-1/2. */}
      <motion.div
        animate={{
          width: searching ? expandedSearchWidth : SEARCH_BUTTON_SIZE,
          x: searching
            ? -expandedSearchWidth / 2
            : toggleWidth / 2 + TOGGLE_SEARCH_GAP_PX,
        }}
        transition={SPRING}
        className="absolute left-1/2 bottom-0 flex items-center rounded-full bg-gray-950/85 backdrop-blur-md ring-1 ring-white/15 shadow-lg shadow-black/30 overflow-hidden"
        style={{ height: SEARCH_BUTTON_SIZE, pointerEvents: "auto" }}
      >
          <AnimatePresence>
            {searching && (
              <motion.input
                ref={inputRef}
                key="search-input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, delay: searching ? 0.12 : 0 }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders…"
                className="absolute inset-y-0 left-0 right-10 bg-transparent pl-4 pr-2 text-sm text-white placeholder:text-white/50 outline-none"
              />
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={searching ? closeSearch : openSearch}
            aria-label={searching ? "Close search" : "Open search"}
            className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-white"
          >
            <AnimatePresence mode="wait" initial={false}>
              {searching ? (
                <motion.span
                  key="x"
                  initial={{ rotate: -45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 45, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="inline-flex"
                >
                  <X className="h-5 w-5" />
                </motion.span>
              ) : (
                <motion.span
                  key="search"
                  initial={{ rotate: 45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -45, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="inline-flex"
                >
                  <Search className="h-5 w-5" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
      </motion.div>
    </div>
  );
}
