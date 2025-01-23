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
  LayoutGrid,
  Magnet,
} from "lucide-react";
import { GiCircularSaw } from "react-icons/gi";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type NavItemBase = {
  hotkey?: string;
  type?: string;
};

type NavLinkItem = NavItemBase & {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

type DividerItem = NavItemBase & {
  type: "divider";
};

type NavItem = NavLinkItem | DividerItem;

const mainNavItems: NavItem[] = [
  { href: "/orders", icon: Logs, label: "Orders", hotkey: "1" },
  { href: "/weekly-planner", icon: ClipboardList, label: "Weekly Planner" },
  // { href: "/shipping", icon: Truck, label: "Shipping", hotkey: "2" },
  { type: "divider" },
  { href: "/paint", icon: PaintbrushVertical, label: "Paint", hotkey: "3" },
  { href: "/packaging", icon: PackageOpen, label: "Packaging", hotkey: "4" },
  { href: "/backboards", icon: Layers3, label: "Backboards", hotkey: "5" },
  { href: "/cutting", icon: GiCircularSaw, label: "Cutting" },
  { type: "divider" },
  { href: "/robotyler", icon: SprayCan, label: "RoboTyler" },
  { href: "/pick-n-place", icon: Magnet, label: "Pick N Place" },
  { href: "/router", icon: Router, label: "Router" },
  { href: "/pick-and-place", icon: LayoutGrid, label: "Pick & Place" },
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

const EASTER_EGG_SEQUENCE = [
  "/orders",
  "/weekly-planner",
  "/orders",
  "/weekly-planner",
];

interface NavbarProps {
  onOpenSettings: () => void;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
}

interface NavLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

export function Navbar({
  onOpenSettings,
  sidebarOpen,
  onSidebarOpenChange,
}: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(pathname);
  const [navigationSequence, setNavigationSequence] = useState<string[]>([]);

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

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleHotkey]);

  const toggleSidebar = () => onSidebarOpenChange(!sidebarOpen);

  const NavLink = ({ href, icon: Icon, label }: NavLinkProps) => {
    if (!href) return null;

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault(); // Prevent default Link navigation

      // Update sequence by keeping last 3 items and adding new href
      const newSequence = [...navigationSequence.slice(-3), href];
      setNavigationSequence(newSequence);

      // Check if sequence matches
      if (
        newSequence.length === 4 &&
        newSequence.every((path, i) => path === EASTER_EGG_SEQUENCE[i])
      ) {
        router.push("/surprise-page");
        setNavigationSequence([]); // Reset sequence
      } else {
        router.push(href); // Normal navigation if sequence doesn't match
      }
    };

    return (
      <Link
        href={href}
        className={`flex items-center rounded-lg px-3 py-4 text-sm font-medium ${
          activeTab === href
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-primary"
        } ${!sidebarOpen ? "justify-center" : ""}`}
        onClick={handleClick}
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
        } fixed h-screen transition-all duration-300 ease-in-out border-r bg-gradient-to-b from-gray-800 to-gray-600 hidden lg:block z-30`}
      >
        <div className="h-16 flex items-center justify-between px-4 bg-gray-950">
          {sidebarOpen && (
            <span
              className="text-lg font-bold cursor-pointer text-foreground hover:text-primary transition-colors"
              onClick={() => router.push("/dashboard")}
            >
              Tuesday
            </span>
          )}
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
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-b from-gray-950/90 to-gray-950/70">
          <div className="flex-1 overflow-y-auto no-scrollbar px-3">
            <div className="flex flex-col space-y-1 py-2">
              {mainNavItems.map((item, index) =>
                item.type === "divider" ? (
                  <Separator
                    key={index}
                    className="my-2 dark:bg-gray-600"
                    decorative
                  />
                ) : (
                  <NavLink
                    key={"href" in item ? item.href : index}
                    href={"href" in item ? item.href : ""}
                    icon={"icon" in item ? item.icon : Menu}
                    label={"label" in item ? item.label : ""}
                  />
                )
              )}
            </div>
          </div>
          <div className="p-3 border-t dark:border-gray-600">
            <div
              className={`${
                sidebarOpen ? "flex gap-2" : "flex flex-col gap-2"
              }`}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex-shrink-0"
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
              <Button
                className={`flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 ${
                  sidebarOpen ? "flex-1" : ""
                }`}
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
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b bg-gray-950 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full flex h-14 items-center px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <span
              className="text-xl font-bold mr-auto cursor-pointer text-foreground hover:text-primary transition-colors"
              onClick={() => router.push("/dashboard")}
            >
              Tuesday
            </span>

            <SheetContent
              side="left"
              className="w-64 p-0 bg-gradient-to-b from-gray-800 to-gray-600"
            >
              <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-gray-950/90 to-gray-950/70">
                <div className="flex-1 flex flex-col space-y-1 py-2 overflow-y-auto no-scrollbar">
                  {mainNavItems.map((item, index) =>
                    item.type === "divider" ? (
                      <Separator key={index} className="my-2" />
                    ) : (
                      <NavLink
                        key={"href" in item ? item.href : index}
                        href={"href" in item ? item.href : ""}
                        icon={"icon" in item ? item.icon : Menu}
                        label={"label" in item ? item.label : ""}
                      />
                    )
                  )}
                </div>
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={onOpenSettings}
                    >
                      <Settings className="mr-2 h-5 w-5" />
                      Settings
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setTheme(theme === "dark" ? "light" : "dark")
                      }
                      className="flex-shrink-0"
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
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
