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
  UserCircle,
  Truck,
  Barcode,
  Drill,
  Box,
  Columns2,
  Columns3,
  Columns4,
} from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import {
  NavSectionCounters,
  NavMetricsBadges,
} from "@/components/ui/NavStatusBadges";

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
  { name: "2 Panels", src: "/pdf/2-panels.pdf", type: "pdf", icon: Columns2 },
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

// Simple hook for responsive design
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const media = window.matchMedia(query);
      const updateMatch = () => setMatches(media.matches);

      updateMatch(); // Initial check
      media.addEventListener("change", updateMatch);

      return () => media.removeEventListener("change", updateMatch);
    }
    return undefined;
  }, [query]);

  return matches;
};

export function Navbar({
  onOpenSettings,
  sidebarOpen,
  onSidebarOpenChange,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(pathname);
  const [settingsHovered, setSettingsHovered] = useState(false);
  const settingsLeaveTimerRef = useRef<number | null>(null);
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
    }, 300);
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

  const openSettingsHover = useCallback(() => {
    if (settingsLeaveTimerRef.current !== null) {
      window.clearTimeout(settingsLeaveTimerRef.current);
      settingsLeaveTimerRef.current = null;
    }
    setSettingsHovered(true);
  }, []);

  const closeSettingsHover = useCallback(() => {
    if (settingsLeaveTimerRef.current !== null) {
      window.clearTimeout(settingsLeaveTimerRef.current);
    }
    settingsLeaveTimerRef.current = window.setTimeout(() => {
      setSettingsHovered(false);
      settingsLeaveTimerRef.current = null;
    }, 300);
  }, []);

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

    const isMobile = useMediaQuery("(max-width: 1023px)");
    const isActive = activeTab === href;
    const isCollapsed = !sidebarOpen && !isMobile;
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
              ${
                isMobile
                  ? "px-4 py-4"
                  : `px-3 py-3 ${isCollapsed ? "justify-center" : ""}`
              }
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
                width={20}
                height={20}
                className={`${isCollapsed ? "mr-0" : "mr-3"}`}
              />
            ) : (
              <Icon
                data-nav-icon
                className={`${isMobile ? "h-5 w-5" : "h-5 w-5 flex-shrink-0"} ${
                  isCollapsed ? "mr-0" : "mr-3"
                }`}
              />
            )}
            {(sidebarOpen || isMobile) && <span>{label}</span>}
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
      {/* Desktop Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } fixed h-screen transition-all duration-300 ease-in-out bg-[hsl(var(--sidebar))] hidden lg:block z-30`}
      >
        <div className="h-screen flex flex-col bg-[hsl(var(--sidebar))]">
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
                <Printer className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="ml-2">Print</span>}
              </Link>
              <motion.div
                onMouseEnter={openPrintHover}
                onMouseLeave={closePrintHover}
                className={`absolute left-full bottom-0 pl-2 z-50 ${
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
                        className="sidebar-action-btn justify-start text-left"
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
                  <Barcode className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span className="ml-2">Quick Labels</span>}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="py-1 leading-none">
                Quick Labels
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Link href="/setup-utility" className="sidebar-action-btn">
                  <PencilRuler className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span className="ml-2">Setup Utility</span>}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="py-1 leading-none">
                Setup Utility
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Link href="/calculator" className="sidebar-action-btn">
                  <Calculator className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span className="ml-2">Calculator</span>}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="py-1 leading-none">
                Calculator
              </TooltipContent>
            </Tooltip>
            <div
              className="relative"
              onMouseEnter={openSettingsHover}
              onMouseLeave={closeSettingsHover}
            >
              <button className="sidebar-action-btn" type="button">
                <Settings className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="ml-2">Settings</span>}
              </button>
              <motion.div
                onMouseEnter={openSettingsHover}
                onMouseLeave={closeSettingsHover}
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
                  {settingsTabs.map(({ value, label, icon: Icon }) => (
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
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Navbar */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b bg-gray-950 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full flex h-14 items-center justify-between px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="w-10 h-10 flex items-center justify-center"
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <span className="text-xl font-bold text-foreground">Tuesday</span>


            <SheetContent
              side="left"
              className="w-4/5 sm:max-w-sm p-0 bg-gradient-to-b from-gray-800 to-gray-600"
            >
              <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-gray-950/90 to-gray-950/70">
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                  <span className="text-xl font-bold cursor-pointer text-foreground">
                    Tuesday
                  </span>
                </div>
                <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
                  {mainNavItems.map((item, index) =>
                    item.type === "divider" ? (
                      <Separator
                        key={index}
                        className="my-2 dark:bg-gray-600/50"
                      />
                    ) : (
                      <div
                        key={"href" in item ? item.href : index}
                        className="px-2 py-1"
                      >
                        {"href" in item && (
                          <motion.div
                            initial={false}
                            animate={
                              activeTab === item.href ? "active" : "inactive"
                            }
                            variants={{
                              active: {
                                backgroundColor: "rgba(59, 130, 246, 0.15)",
                                borderRadius: "0.5rem",
                              },
                              inactive: {
                                backgroundColor: "rgba(0, 0, 0, 0)",
                                borderRadius: "0.5rem",
                              },
                            }}
                            transition={{ duration: 0.2 }}
                            className="relative"
                          >
                            {activeTab === item.href && (
                              <motion.div
                                layoutId="activeNavItem"
                                className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              />
                            )}
                            <NavLink
                              href={"href" in item ? item.href : ""}
                              icon={"icon" in item ? item.icon : Menu}
                              label={"label" in item ? item.label : ""}
                            />
                          </motion.div>
                        )}
                      </div>
                    )
                  )}
                </div>
                <div className="p-4 border-t border-gray-700">
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base"
                      onClick={() => onOpenSettings()}
                    >
                      <Settings className="mr-2 h-5 w-5" />
                      Settings
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

    </>
  );
}
