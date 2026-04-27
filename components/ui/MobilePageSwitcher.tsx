"use client";

import { usePathname } from "next/navigation";
import { PageToggle } from "@/components/ui/PageToggle";

const SWITCHER_ROUTES = new Set(["/orders", "/production-planning"]);

export function MobilePageSwitcher() {
  const pathname = usePathname();
  if (!SWITCHER_ROUTES.has(pathname)) return null;

  const currentPage = pathname === "/orders" ? "orders" : "planner";

  return (
    <div
      className="lg:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="rounded-full bg-gray-950/85 backdrop-blur-md ring-1 ring-white/15 shadow-lg shadow-black/30">
        <PageToggle currentPage={currentPage} />
      </div>
    </div>
  );
}
