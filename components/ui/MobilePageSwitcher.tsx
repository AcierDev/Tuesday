"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";

import { PageToggle } from "@/components/ui/PageToggle";
import { useOrderStore } from "@/stores/useOrderStore";

const SWITCHER_ROUTES = new Set(["/orders", "/production-planning"]);

const SEARCH_BAR_WIDTH = 240;
const SEARCH_BUTTON_SIZE = 40;
const TOGGLE_LIFT_PX = 52;
const SPRING = { duration: 0.32, ease: [0.32, 1.2, 0.55, 1] as const };

export function MobilePageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const setSearchQuery = useOrderStore((s) => s.setSearchQuery);
  const searchQuery = useOrderStore((s) => s.searchQuery);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searching) inputRef.current?.focus();
  }, [searching]);

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

  return (
    <div
      className="lg:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative flex items-end gap-2">
        <motion.div
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

        <motion.div
          animate={{ width: searching ? SEARCH_BAR_WIDTH : SEARCH_BUTTON_SIZE }}
          transition={SPRING}
          className="relative flex items-center rounded-full bg-gray-950/85 backdrop-blur-md ring-1 ring-white/15 shadow-lg shadow-black/30 overflow-hidden"
          style={{ height: SEARCH_BUTTON_SIZE }}
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
    </div>
  );
}
