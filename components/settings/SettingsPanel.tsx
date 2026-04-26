"use client";

import { X } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { ColumnVisibilitySettings } from "./ColumnVisibilitySettings";
import { DueBadgeSettings } from "./DueBadgeSettings";
import { RecentEditsSettings } from "./RecentEditsSettings";
import { ShippingSettingsEditor } from "./ShippingSettingsEditor";

import { OrderSettings } from "@/typings/types";

interface SettingsPanelProps {
  settings: OrderSettings;
  updateSettings: (newSettings: Partial<OrderSettings>) => void;
  onClose: () => void;
  initialTab?: string;
}

const SECTION_TITLES: Record<string, string> = {
  "due-badge": "Due Badge",
  "recent-edits": "Recent Edits",
  shipping: "Shipping",
  columns: "Column Visibility",
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  updateSettings,
  onClose,
  initialTab = "due-badge",
}) => {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const activeTab = initialTab;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOutsideClick = useCallback(
    (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    },
    [onClose]
  );

  const handleEscapeKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [handleOutsideClick, handleEscapeKey]);

  if (!mounted) {
    return null;
  }

  const saveSettings = () => {
    updateSettings(settings);
    toast.success("Settings saved successfully");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        ref={dialogRef}
        className="bg-background text-foreground rounded-lg shadow-lg w-full max-w-[1120px] h-[90vh] overflow-hidden flex flex-col dark:bg-gray-800"
      >
        <div className="flex flex-col h-full">
          <div className="flex-grow overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {SECTION_TITLES[activeTab] ?? "Settings"}
              </h2>
              <Button size="icon" variant="ghost" onClick={onClose}>
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            {activeTab === "columns" && (
              <ColumnVisibilitySettings
                columnVisibility={settings.columnVisibility}
                showSortingIcons={settings.showSortingIcons}
                updateSettings={updateSettings}
                updateColumnVisibility={(group, field, isVisible) =>
                  updateSettings({
                    columnVisibility: {
                      ...settings.columnVisibility,
                      [group]: {
                        ...settings.columnVisibility[
                          group as keyof typeof settings.columnVisibility
                        ],
                        [field]: isVisible,
                      },
                    },
                  })
                }
              />
            )}
            {activeTab === "due-badge" && (
              <DueBadgeSettings
                dueBadgeDays={settings.dueBadgeDays}
                onDeckMinCount={settings.onDeckMinCount}
                updateSettings={updateSettings}
              />
            )}
            {activeTab === "recent-edits" && (
              <RecentEditsSettings
                recentEditHours={settings.recentEditHours}
                updateSettings={updateSettings}
              />
            )}
            {activeTab === "shipping" && <ShippingSettingsEditor />}
          </div>
          {activeTab === "shipping" ? (
            <div className="border-t mt-auto p-4 bg-muted dark:bg-gray-700 flex justify-end items-center">
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : (
            <div className="border-t mt-auto p-4 bg-muted dark:bg-gray-700 flex justify-between items-center">
              <Button
                variant="ghost"
                onClick={() => console.log("Restore defaults")}
              >
                Restore Defaults
              </Button>
              <div className="space-x-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={saveSettings}>Save Changes</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
