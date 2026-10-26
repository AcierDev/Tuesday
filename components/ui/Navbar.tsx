"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calculator,
  Printer,
  PencilRuler,
  Menu,
  Barcode,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FedExPickupBadge,
  NavSectionCounters,
  NavMetricsBadges,
} from "@/components/ui/NavStatusBadges";
import { SawBladeIcon } from "@/components/ui/NavbarIcons";
import { NavbarLink } from "@/components/ui/NavbarLink";
import { NavbarPrintMenu } from "@/components/ui/NavbarPrintMenu";
import { NavbarSettingsMenu } from "@/components/ui/NavbarSettingsMenu";
import { useNavRailScale } from "@/components/ui/useNavRailScale";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔌 ESP32 DASHBOARD                                                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
const ESP32_DASHBOARD_URL = "http://192.168.1.228";

type NavItemBase = {
  hotkey?: string;
  type?: string;
};

type NavLinkItem = NavItemBase & {
  href: string;
  icon: React.ComponentType<{ className?: string }> | string;
  label: string;
};

type DividerItem = NavItemBase & {
  type: "divider";
};

type NavItem = NavLinkItem | DividerItem;

// Orders / Weekly Planner / Production Planning live in the page-level
// slider on the Orders + Planner headers — no longer surfaced in the navbar.
const mainNavItems: NavItem[] = [];

const bottomNavItems: NavLinkItem[] = [
  { href: "/print", icon: Printer, label: "Print", hotkey: "7" },
  {
    href: "/setup-utility",
    icon: PencilRuler,
    label: "Setup Utility",
    hotkey: "9",
  },
  { href: "/calculator", icon: Calculator, label: "Calculator", hotkey: "6" },
];

interface NavbarProps {
  onOpenSettings: (tab?: string) => void;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
}

const isInputElement = (element: Element | null): boolean => {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    element.getAttribute("contenteditable") === "true"
  );
};

export function Navbar({
  onOpenSettings,
  sidebarOpen,
  onSidebarOpenChange,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(pathname);
  const { railRef, railScale } = useNavRailScale();

  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

  const handleHotkey = useCallback(
    (key: string) => {
      const navItem = [...mainNavItems, ...bottomNavItems].find(
        (item) => "hotkey" in item && item.hotkey === key
      );
      if (navItem && "href" in navItem) {
        router.push(navItem.href);
      }
    },
    [router]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInputElement(document.activeElement)) {
        return;
      }

      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const key = event.key;
      if (/^[1-9]$/.test(key)) {
        event.preventDefault();
        handleHotkey(key);
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleHotkey]);

  return (
    /* Sidebar — desktop only; mobile uses a floating PageToggle. */
    <aside
        className={`${
          sidebarOpen ? "w-64" : "w-[4.25rem]"
        } fixed inset-y-0 left-0 transition-[width] duration-300 ease-in-out bg-[hsl(var(--sidebar))] hidden lg:block z-30 overflow-visible`}
      >
        <div
          ref={railRef}
          className="min-h-screen flex flex-col bg-[hsl(var(--sidebar))]"
          style={{
            transform: railScale < 1 ? `scale(${railScale})` : undefined,
            transformOrigin: "top center",
          }}
        >
          <FedExPickupBadge />
          <NavMetricsBadges />
          {/* Soft gradient divider below the metric badges. */}
          <div
            aria-hidden
            className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="flex flex-col space-y-1 pt-6 px-3">
              {mainNavItems.map((item, index) => {
                if (item.type === "divider") {
                  return (
                    <Separator
                      key={index}
                      className="my-2 dark:bg-gray-600"
                      decorative
                    />
                  );
                }
                return (
                  <NavbarLink
                    key={"href" in item ? item.href : index}
                    href={"href" in item ? item.href : ""}
                    icon={"icon" in item ? item.icon : Menu}
                    label={"label" in item ? item.label : ""}
                    activeTab={activeTab}
                    sidebarOpen={sidebarOpen}
                  />
                );
              })}
            </div>
          </div>
          {/* Soft gradient divider above the section counters. */}
          <div
            aria-hidden
            className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
          <NavSectionCounters />
          {/* Soft gradient divider between section counters and the bottom (print/setup/calc) buttons. */}
          <div
            aria-hidden
            className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
          <div className="p-3 space-y-2">
            <NavbarPrintMenu sidebarOpen={sidebarOpen} />
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Link href="/quick-label" className="sidebar-action-btn">
                  <Barcode className={`${sidebarOpen ? "h-5 w-5" : "h-6 w-6"} flex-shrink-0`} />
                  {sidebarOpen && <span className="ml-2">Quick Labels</span>}
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="py-1 leading-none -translate-y-[7px]"
              >
                Quick Labels
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Link href="/setup-utility" className="sidebar-action-btn">
                  <PencilRuler className={`${sidebarOpen ? "h-5 w-5" : "h-6 w-6"} flex-shrink-0`} />
                  {sidebarOpen && <span className="ml-2">Setup Utility</span>}
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="py-1 leading-none -translate-y-[7px]"
              >
                Setup Utility
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Link href="/calculator" className="sidebar-action-btn">
                  <Calculator className={`${sidebarOpen ? "h-5 w-5" : "h-6 w-6"} flex-shrink-0`} />
                  {sidebarOpen && <span className="ml-2">Calculator</span>}
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="py-1 leading-none -translate-y-[7px]"
              >
                Calculator
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <a
                  href={ESP32_DASHBOARD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sidebar-action-btn"
                >
                  <SawBladeIcon className={`${sidebarOpen ? "h-5 w-5" : "h-6 w-6"} flex-shrink-0`} />
                  {sidebarOpen && <span className="ml-2">ESP32</span>}
                </a>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="py-1 leading-none -translate-y-[7px]"
              >
                Table Saw Dashboard
              </TooltipContent>
            </Tooltip>
            <NavbarSettingsMenu
              sidebarOpen={sidebarOpen}
              onOpenSettings={onOpenSettings}
            />
          </div>
        </div>
      </aside>
  );
}
