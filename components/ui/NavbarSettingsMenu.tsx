"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Edit, Settings, Truck } from "lucide-react";
import { motion } from "framer-motion";

import { SliderSettingPopover } from "@/components/settings/SliderSettingPopover";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";

const settingsTabs: {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "recent-edits", label: "Recent Edits", icon: Edit },
  { value: "shipping", label: "Shipping", icon: Truck },
];

interface NavbarSettingsMenuProps {
  sidebarOpen: boolean;
  onOpenSettings: (tab?: string) => void;
}

// Settings button with a click-to-open popout (recent-edit slider + tabs).
export function NavbarSettingsMenu({
  sidebarOpen,
  onOpenSettings,
}: NavbarSettingsMenuProps) {
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

  return (
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
      {/* Fixed (not absolute) so the popout escapes the sidebar's
          overflow-y-auto clip box — the print hover above uses the
          same pattern. Anchored to the sidebar's right edge via
          left-64 / left-[4.25rem] depending on sidebarOpen. */}
      <motion.div
        className={`fixed ${
          sidebarOpen ? "left-64" : "left-[4.25rem]"
        } bottom-3 pl-2 z-50 ${
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
  );
}
