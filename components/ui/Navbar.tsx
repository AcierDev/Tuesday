"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  PaintbrushVertical,
  PackageOpen,
  Layers3,
  Calculator,
  Printer,
  Power,
  PencilRuler,
  Settings,
  Menu,
  SprayCan,
  LayoutGrid,
  Magnet,
  Scissors,
  BarChart3,
  Clock,
  Edit,
  ListTodo,
  UserCircle,
  Truck,
  Barcode,
  Drill,
  Box,
  Columns3,
  Columns4,
} from "lucide-react";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔌 ESP32 DASHBOARD                                                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
const ESP32_DASHBOARD_URL = "http://192.168.1.248";

const SawBladeIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12,1 L12.65,3.73 L16.77,2.09 L16.18,4.83 L20.60,5.14 L18.88,7.35 L22.72,9.55 L20.21,10.79 L22.72,14.45 L19.92,14.47 L20.60,18.86 L18.06,17.67 L16.77,21.91 L15.00,19.74 L12,23 L11.35,20.27 L7.23,21.91 L7.82,19.17 L3.40,18.86 L5.12,16.65 L1.28,14.45 L3.79,13.21 L1.28,9.55 L4.08,9.53 L3.40,5.14 L5.94,6.33 L7.23,2.09 L9.00,4.26 Z" />
    <circle cx="12" cy="12" r="1.5" />
  </svg>
);

const Columns5 = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M6.6 3v18" />
    <path d="M10.2 3v18" />
    <path d="M13.8 3v18" />
    <path d="M17.4 3v18" />
  </svg>
);
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import {
  FedExPickupBadge,
  NavSectionCounters,
  NavMetricsBadges,
} from "@/components/ui/NavStatusBadges";
import { SliderSettingPopover } from "@/components/settings/SliderSettingPopover";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";

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

const settingsTabs: {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "due-badge", label: "Due Badge", icon: Clock },
  { value: "on-deck", label: "On Deck", icon: ListTodo },
  { value: "recent-edits", label: "Recent Edits", icon: Edit },
  { value: "shipping", label: "Shipping", icon: Truck },
];

type PrintTemplateBase = {
  name: string;
  src: string;
  icon: React.ComponentType<{ className?: string }>;
};

type PrintTemplate =
  | (PrintTemplateBase & { type: "pdf" })
  | (PrintTemplateBase & {
      type: "image";
      orientation: "landscape" | "portrait";
    });

const printTemplates: PrintTemplate[] = [
  {
    name: "Drywall Anchors",
    src: "/images/drywall-anchors.png",
    type: "image",
    orientation: "landscape",
    icon: Drill,
  },
  { name: "2 Boxes", src: "/pdf/2-boxes.pdf", type: "pdf", icon: Box },
  { name: "3 Boxes", src: "/pdf/3-boxes.pdf", type: "pdf", icon: Box },
  { name: "4 Boxes", src: "/pdf/4-boxes.pdf", type: "pdf", icon: Box },
  { name: "3 Panels", src: "/pdf/3-panels.pdf", type: "pdf", icon: Columns3 },
  { name: "4 Panels", src: "/pdf/4-panels.pdf", type: "pdf", icon: Columns4 },
  { name: "5 Panels", src: "/pdf/5-panels.pdf", type: "pdf", icon: Columns5 },
];

const printPdf = (src: string) => {
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  iframe.src = src;
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // iframe contents may not allow direct print access
    }
    window.setTimeout(() => iframe.remove(), 60000);
  };
  document.body.appendChild(iframe);
};

const printImage = (src: string, orientation: "landscape" | "portrait") => {
  const isLandscape = orientation === "landscape";
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Print Label</title>
        <style>
          @page { size: ${isLandscape ? "6in 4in" : "4in 6in"}; margin: 0; }
          html, body {
            margin: 0; padding: 0;
            width: ${isLandscape ? "6in" : "4in"};
            height: ${isLandscape ? "4in" : "6in"};
            display: flex; justify-content: center; align-items: center;
          }
          img {
            max-width: 100%; max-height: 100%; object-fit: contain;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
          }
          @media print {
            html, body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            img { image-resolution: 300dpi; }
          }
        </style>
      </head>
      <body><img src="${src}" alt="Print"/></body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  iframe.srcdoc = html;
  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) return;
    const img = iframe.contentDocument?.querySelector("img");
    const triggerPrint = () => {
      try {
        win.focus();
        win.print();
      } catch {
        // noop
      }
      window.setTimeout(() => iframe.remove(), 60000);
    };
    if (img && !img.complete) {
      img.addEventListener("load", triggerPrint, { once: true });
      img.addEventListener("error", triggerPrint, { once: true });
    } else {
      triggerPrint();
    }
  };
  document.body.appendChild(iframe);
};

interface NavLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }> | string;
  label: string;
}

export function Navbar({
  onOpenSettings,
  sidebarOpen,
  onSidebarOpenChange,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(pathname);
  const [settingsHovered, setSettingsHovered] = useState(false);
  const settingsContainerRef = useRef<HTMLDivElement | null>(null);
  // Which slider popover (if any) is currently open. Single source of truth so
  // clicking a different trigger cleanly switches instead of closing the menu.
  const [openSliderId, setOpenSliderId] = useState<string | null>(null);
  const sliderPopoverOpen = openSliderId !== null;
  const setSliderOpen = useCallback(
    (id: string) => (open: boolean) =>
      setOpenSliderId((current) => {
        if (open) return id;
        return current === id ? null : current;
      }),
    []
  );
  const { settings, updateSettings } = useOrderSettings();
  const [printHovered, setPrintHovered] = useState(false);
  const printLeaveTimerRef = useRef<number | null>(null);

  const openPrintHover = useCallback(() => {
    if (printLeaveTimerRef.current !== null) {
      window.clearTimeout(printLeaveTimerRef.current);
      printLeaveTimerRef.current = null;
    }
    setPrintHovered(true);
  }, []);

  const closePrintHover = useCallback(() => {
    if (printLeaveTimerRef.current !== null) {
      window.clearTimeout(printLeaveTimerRef.current);
    }
    printLeaveTimerRef.current = window.setTimeout(() => {
      setPrintHovered(false);
      printLeaveTimerRef.current = null;
    }, 400);
  }, []);

  const handleQuickPrint = useCallback((tpl: PrintTemplate) => {
    if (printLeaveTimerRef.current !== null) {
      window.clearTimeout(printLeaveTimerRef.current);
      printLeaveTimerRef.current = null;
    }
    setPrintHovered(false);
    if (tpl.type === "pdf") {
      printPdf(tpl.src);
    } else {
      printImage(tpl.src, tpl.orientation);
    }
  }, []);

  const toggleSettingsMenu = useCallback(() => {
    setSettingsHovered((open) => {
      if (open) setOpenSliderId(null);
      return !open;
    });
  }, []);

  // Close the settings menu on outside click.
  useEffect(() => {
    if (!settingsHovered) return;
    const onPointerDown = (e: MouseEvent) => {
      // Don't dismiss the menu while a slider popover is open — Radix
      // portals it outside, so an outside-click would close the menu
      // from underneath the user's cursor.
      if (sliderPopoverOpen) return;
      const root = settingsContainerRef.current;
      if (root && !root.contains(e.target as Node)) {
        setSettingsHovered(false);
        setOpenSliderId(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [settingsHovered, sliderPopoverOpen]);

  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

  const isInputElement = (element: Element | null): boolean => {
    if (!element) return false;
    const tagName = element.tagName.toLowerCase();
    return (
      tagName === "input" ||
      tagName === "textarea" ||
      element.getAttribute("contenteditable") === "true"
    );
  };

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

  const NavLink = ({ href, icon: Icon, label }: NavLinkProps) => {
    if (!href) return null;

    const isActive = activeTab === href;
    const isCollapsed = !sidebarOpen;
    const [hovered, setHovered] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      if (hovered && isCollapsed && wrapperRef.current) {
        const iconEl = wrapperRef.current.querySelector<HTMLElement>(
          "[data-nav-icon]"
        );
        const iconRect = (iconEl ?? wrapperRef.current).getBoundingClientRect();
        const wrapperRect = wrapperRef.current.getBoundingClientRect();
        setTooltipPos({
          top: iconRect.top + iconRect.height / 2,
          left: wrapperRect.right + 8,
        });
      }
    }, [hovered, isCollapsed]);

    return (
      <div
        ref={wrapperRef}
        className={`relative ${isCollapsed ? "py-1 -my-1" : ""}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.div
          animate={{ x: isCollapsed && hovered ? 4 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <Link
            href={href}
            className={`flex items-center w-full rounded-lg text-sm font-medium
              px-3 py-3 ${isCollapsed ? "justify-center" : ""}
              ${
                isActive
                  ? "bg-secondary text-secondary-foreground dark:bg-blue-900/30 dark:text-blue-200"
                  : "text-muted-foreground hover:bg-muted hover:text-primary dark:hover:bg-gray-800/50"
              }
              transition-colors duration-200 relative`}
          >
            {typeof Icon === "string" ? (
              <Image
                data-nav-icon
                src={Icon}
                alt={label}
                width={isCollapsed ? 24 : 20}
                height={isCollapsed ? 24 : 20}
                className={`${isCollapsed ? "mr-0" : "mr-3"}`}
              />
            ) : (
              <Icon
                data-nav-icon
                className={`flex-shrink-0 ${
                  isCollapsed ? "h-6 w-6 mr-0" : "h-5 w-5 mr-3"
                }`}
              />
            )}
            {sidebarOpen && <span>{label}</span>}
            {isActive && (
              <span className="absolute inset-y-0 left-0 w-1 bg-blue-500 rounded-r-full" />
            )}
          </Link>
        </motion.div>
        {isCollapsed &&
          mounted &&
          createPortal(
            <div
              className="fixed -translate-y-1/2 z-[100] pointer-events-none"
              style={{ top: tooltipPos.top, left: tooltipPos.left }}
            >
              <motion.div
                initial={false}
                animate={{
                  opacity: hovered ? 1 : 0,
                  x: hovered ? 0 : -8,
                }}
                transition={{ duration: 0.12, ease: "easeOut" }}
              >
                <div className="px-3 py-2 text-sm font-medium leading-none text-foreground bg-gray-900/90 backdrop-blur-md backdrop-saturate-150 border border-white/15 rounded-lg shadow-lg whitespace-nowrap scale-[1.15] origin-left">
                  {label}
                </div>
              </motion.div>
            </div>,
            document.body
          )}
      </div>
    );
  };

  return (
    <>
      {/* Sidebar — desktop only; mobile uses a floating PageToggle. */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-[4.25rem]"
        } fixed h-screen transition-all duration-300 ease-in-out bg-[hsl(var(--sidebar))] hidden lg:block z-30`}
      >
        <div className="h-screen flex flex-col bg-[hsl(var(--sidebar))]">
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
                  <NavLink
                    key={"href" in item ? item.href : index}
                    href={"href" in item ? item.href : ""}
                    icon={"icon" in item ? item.icon : Menu}
                    label={"label" in item ? item.label : ""}
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
            <div
              className="relative"
              onMouseEnter={openPrintHover}
              onMouseLeave={closePrintHover}
            >
              <Link href="/print" className="sidebar-action-btn">
                <Printer className={`${sidebarOpen ? "h-5 w-5" : "h-6 w-6"} flex-shrink-0`} />
                {sidebarOpen && <span className="ml-2">Print</span>}
              </Link>
              <motion.div
                onMouseEnter={openPrintHover}
                onMouseLeave={closePrintHover}
                className={`fixed bottom-0 ${
                  sidebarOpen ? "left-64" : "left-[4.25rem]"
                } pl-2 pb-3 z-50 ${
                  printHovered ? "" : "pointer-events-none"
                }`}
                initial={{ opacity: 0, x: -8 }}
                animate={{
                  opacity: printHovered ? 1 : 0,
                  x: printHovered ? 0 : -8,
                }}
                transition={{ duration: 0.1, ease: "easeOut" }}
              >
                <motion.div
                  className="flex flex-col gap-1.5 min-w-[180px]"
                  initial="hidden"
                  animate={printHovered ? "visible" : "hidden"}
                  variants={{
                    hidden: {
                      transition: {
                        staggerChildren: 0.02,
                        staggerDirection: 1,
                      },
                    },
                    visible: {
                      transition: {
                        staggerChildren: 0.03,
                        staggerDirection: -1,
                        delayChildren: 0.04,
                      },
                    },
                  }}
                >
                  {printTemplates.map((tpl) => {
                    const Icon = tpl.icon;
                    return (
                      <motion.button
                        key={tpl.name}
                        variants={{
                          hidden: { opacity: 0, y: 4 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.12, ease: "easeOut" }}
                        onClick={() => handleQuickPrint(tpl)}
                        className="sidebar-action-btn !bg-gray-900/65 hover:!bg-gray-900/95 justify-start text-left"
                      >
                        <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
                        {tpl.name}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </motion.div>
            </div>
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
            <div
              ref={settingsContainerRef}
              className="relative"
            >
              <button
                className="sidebar-action-btn"
                type="button"
                onClick={toggleSettingsMenu}
              >
                <Settings className={`${sidebarOpen ? "h-5 w-5" : "h-6 w-6"} flex-shrink-0`} />
                {sidebarOpen && <span className="ml-2">Settings</span>}
              </button>
              <motion.div
                className={`absolute left-full bottom-0 pl-2 z-50 ${
                  settingsHovered ? "" : "pointer-events-none"
                }`}
                initial={{ opacity: 0, x: -8 }}
                animate={{
                  opacity: settingsHovered ? 1 : 0,
                  x: settingsHovered ? 0 : -8,
                }}
                transition={{ duration: 0.1, ease: "easeOut" }}
              >
                <motion.div
                  className="flex flex-col gap-2 min-w-[200px]"
                  initial="hidden"
                  animate={settingsHovered ? "visible" : "hidden"}
                  variants={{
                    hidden: {
                      transition: {
                        staggerChildren: 0.02,
                        staggerDirection: 1,
                      },
                    },
                    visible: {
                      transition: {
                        staggerChildren: 0.03,
                        staggerDirection: -1,
                        delayChildren: 0.04,
                      },
                    },
                  }}
                >
                  {settingsTabs.map(({ value, label, icon: Icon }) => {
                    if (value === "due-badge") {
                      return (
                        <SliderSettingPopover
                          key={value}
                          label={label}
                          icon={Icon}
                          value={settings.dueBadgeDays ?? 3}
                          min={1}
                          max={14}
                          onChange={(v) => updateSettings({ dueBadgeDays: v })}
                          open={openSliderId === value}
                          onOpenChange={setSliderOpen(value)}
                          description="Days before due date when the day-counter badge turns yellow."
                        />
                      );
                    }
                    if (value === "on-deck") {
                      return (
                        <SliderSettingPopover
                          key={value}
                          label={label}
                          icon={Icon}
                          value={settings.onDeckMinCount ?? 12}
                          min={0}
                          max={30}
                          onChange={(v) => updateSettings({ onDeckMinCount: v })}
                          open={openSliderId === value}
                          onOpenChange={setSliderOpen(value)}
                          description="Minimum items kept on deck. Yellow/red items promote first, then closest-to-due items from New fill the rest."
                        />
                      );
                    }
                    if (value === "recent-edits") {
                      return (
                        <SliderSettingPopover
                          key={value}
                          label={label}
                          icon={Icon}
                          value={settings.recentEditHours ?? 24}
                          min={1}
                          max={72}
                          onChange={(v) => updateSettings({ recentEditHours: v })}
                          enabled={settings.recentEditHours !== undefined}
                          onEnabledChange={(on) =>
                            updateSettings({ recentEditHours: on ? 24 : undefined })
                          }
                          open={openSliderId === value}
                          onOpenChange={setSliderOpen(value)}
                          description={`Hours the blue circle shows on recently edited items.`}
                          offDescription="The recent edit indicator is turned off."
                        />
                      );
                    }
                    return (
                      <motion.button
                        key={value}
                        variants={{
                          hidden: { opacity: 0, y: 4 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.12, ease: "easeOut" }}
                        onClick={() => onOpenSettings(value)}
                        className="flex items-center px-3 py-2.5 text-sm text-foreground bg-gray-900/50 backdrop-blur-md backdrop-saturate-150 border border-white/15 rounded-lg shadow-lg hover:bg-gray-900/80 hover:border-white/30 hover:text-primary transition text-left"
                      >
                        <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
                        {label}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </aside>

    </>
  );
}
