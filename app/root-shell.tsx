"use client";

import { usePathname } from "next/navigation";

import { SITE_ACCESS_PATH } from "@/lib/app-boot";
import { AppShell } from "./app-shell";

// The password page renders bare; the stores skip their data boot there
// (see lib/app-boot.ts).
export function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === SITE_ACCESS_PATH) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
