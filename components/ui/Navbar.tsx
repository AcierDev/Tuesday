"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Moon,
  Sun,
  Logs,
  Truck,
  PaintbrushVertical,
  PackageOpen,
  Layers3,
  Calculator,
  Printer,
  Power,
  Accessibility,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  ClipboardList,
  Router,
  SprayCan,
} from "lucide-react";
import { GiCircularSaw } from "react-icons/gi";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const mainNavItems = [
  { href: "/orders", icon: Logs, label: "Orders", hotkey: "1" },
  { href: "/shipping", icon: Truck, label: "Shipping", hotkey: "2" },
  { type: "divider" },
  { href: "/paint", icon: PaintbrushVertical, label: "Paint", hotkey: "3" },
  { href: "/packaging", icon: PackageOpen, label: "Packaging", hotkey: "4" },
  { href: "/backboards", icon: Layers3, label: "Backboards", hotkey: "5" },
  { href: "/cutting", icon: GiCircularSaw, label: "Cutting" },
  { type: "divider" },
  { href: "/robotyler", icon: SprayCan, label: "RoboTyler" },
  { href: "/router", icon: Router, label: "Router" },
  { type: "divider" },
  { href: "/inventory", icon: ClipboardList, label: "Inventory" },
  { type: "divider" },
  {
    href: "/setup-utility",
    icon: Accessibility,
    label: "Setup Utility",
    hotkey: "9",
  },
  { href: "/print", icon: Printer, label: "Print", hotkey: "7" },
  { href: "/outlets", icon: Power, label: "Outlets", hotkey: "8" },
  { href: "/calculator", icon: Calculator, label: "Calculator", hotkey: "6" },
];

interface NavbarProps {
  onOpenSettings: () => void;
}

export function Navbar({ onOpenSettings }: NavbarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(pathname);

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
      const navItem = mainNavItems.find((item) => item.hotkey === key);
      if (navItem) {
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

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleHotkey]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const NavLink = ({ href, icon: Icon, label }) => {
    if (!href) return null;
    return (
      <Link
        href={href}
        className={`flex items-center rounded-lg px-3 py-4 text-sm font-medium ${
          activeTab === href
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-primary"
        } ${!sidebarOpen ? "justify-center" : ""}`}
        onClick={() => setActiveTab(href)}
      >
        <Icon
          className={`h-5 w-5 flex-shrink-0 ${!sidebarOpen ? "mr-0" : "mr-3"}`}
        />
        {sidebarOpen && <span>{label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } transition-all duration-300 ease-in-out border-r bg-background dark:bg-gray-800 hidden lg:flex lg:flex-col`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          {sidebarOpen && <span className="text-lg font-bold">Tuesday</span>}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={sidebarOpen ? "" : "mx-auto"}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </div>
        <div className="flex-1 flex flex-col justify-between py-2">
          <div className="flex-1 flex flex-col space-y-1 px-3">
            {mainNavItems.map((item, index) =>
              item.type === "divider" ? (
                <Separator
                  key={index}
                  className="my-2 dark:bg-gray-600"
                  decorative
                />
              ) : (
                <NavLink key={item.href} {...item} />
              )
            )}
          </div>
          <div className="mt-auto">
            <div className="p-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-full flex items-center justify-center"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
                <span className="sr-only">
                  {theme === "dark"
                    ? "Switch to light theme"
                    : "Switch to dark theme"}
                </span>
              </Button>
            </div>
            <div className="p-3">
              <Button
                className="w-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={onOpenSettings}
              >
                <Settings className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="ml-2">Settings</span>}
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Navbar */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b bg-background dark:bg-gray-800 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full flex h-14 items-center px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <span className="text-xl font-bold mr-4">Tuesday</span>

            <SheetContent side="left" className="w-64 p-0 dark:bg-gray-800">
              <div className="flex flex-col h-full">
                <div className="flex-1 flex flex-col space-y-1 py-2">
                  {mainNavItems.map((item, index) =>
                    item.type === "divider" ? (
                      <Separator key={index} className="my-2" />
                    ) : (
                      <NavLink key={item.href} {...item} />
                    )
                  )}
                </div>
                <div className="p-4">
                  <Button
                    className="w-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={onOpenSettings}
                  >
                    <Settings className="mr-2 h-5 w-5" />
                    Settings
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </nav>
    </>
  );
}
