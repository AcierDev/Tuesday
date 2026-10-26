"use client";

import { X } from "lucide-react";
import { useEffect, useState, useRef, useCallback, useId } from "react";

import { Button } from "@/components/ui/button";

import { ColumnVisibilitySettings } from "./ColumnVisibilitySettings";
import { RecentEditsSettings } from "./RecentEditsSettings";
import {
  ShippingSettingsEditor,
  type ShippingSettingsEditorHandle,
} from "./ShippingSettingsEditor";

import { OrderSettings } from "@/typings/types";

interface SettingsPanelProps {
  settings: OrderSettings;
  updateSettings: (newSettings: Partial<OrderSettings>) => void;
  onClose: () => void;
  initialTab?: string;
}

const SECTION_TITLES: Record<string, string> = {
  "recent-edits": "Recent Edits",
  shipping: "Shipping",
  columns: "Column Visibility",
};

// Escape closes the panel unless a Radix layer inside it (Select, AlertDialog,
// Popover…) already handled the key — Radix calls preventDefault when it
// dismisses itself, so the first Escape only closes that layer.
export function shouldCloseOnKeyDown(
  event: Pick<KeyboardEvent, "key" | "defaultPrevented">
): boolean {
  return event.key === "Escape" && !event.defaultPrevented;
}

// Only a press that starts on the backdrop itself counts as "outside". Radix
// portals (Select options, AlertDialog) live outside the panel's DOM box, so a
// DOM-containment check would treat picking an option as an outside click.
export function isBackdropPress(
  event: Pick<MouseEvent, "target" | "currentTarget">
): boolean {
  return event.target === event.currentTarget;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  updateSettings,
  onClose,
  initialTab = "recent-edits",
}) => {
  const [mounted, setMounted] = useState(false);
  // Column and recent-edit settings apply live; Cancel restores this snapshot.
  const [settingsOnOpen] = useState(settings);
  const shippingEditorRef = useRef<ShippingSettingsEditorHandle>(null);
  const titleId = useId();
  const activeTab = initialTab;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Every close path flushes the shipping editor's pending autosave first. If
  // that save fails the panel stays open so the inline error is visible.
  const requestClose = useCallback(async () => {
    const editor = shippingEditorRef.current;
    if (editor && !(await editor.flush())) return;
    onClose();
  }, [onClose]);

  const handleEscapeKey = useCallback(
    (event: KeyboardEvent) => {
      if (shouldCloseOnKeyDown(event)) {
        void requestClose();
      }
    },
    [requestClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [handleEscapeKey]);

  if (!mounted) {
    return null;
  }

  const cancelChanges = () => {
    updateSettings(settingsOnOpen);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onMouseDown={(event) => {
        if (isBackdropPress(event)) void requestClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white dark:bg-gray-900 text-foreground rounded-2xl shadow-xl ring-1 ring-gray-200/60 dark:ring-gray-800 w-full max-w-[1120px] h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex flex-col h-full">
          <div className="select-none bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-7 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
              <h2
                id={titleId}
                className="text-lg sm:text-xl font-semibold tracking-tight bg-gradient-to-br from-gray-900 to-blue-700 dark:from-white dark:to-blue-300 bg-clip-text text-transparent [-webkit-text-fill-color:transparent] [forced-color-adjust:none]"
              >
                {SECTION_TITLES[activeTab] ?? "Settings"}
              </h2>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => void requestClose()}
              className="rounded-full"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <div className="flex-grow overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
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
            {activeTab === "recent-edits" && (
              <RecentEditsSettings
                recentEditHours={settings.recentEditHours}
                updateSettings={updateSettings}
              />
            )}
            {activeTab === "shipping" && (
              <ShippingSettingsEditor ref={shippingEditorRef} />
            )}
          </div>
          {activeTab === "shipping" ? (
            <div className="border-t border-gray-200/80 dark:border-gray-800 mt-auto p-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md flex justify-end items-center">
              <Button variant="ghost" onClick={() => void requestClose()}>
                Close
              </Button>
            </div>
          ) : (
            <div className="border-t border-gray-200/80 dark:border-gray-800 mt-auto p-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md flex justify-end items-center gap-2">
              <Button variant="ghost" onClick={cancelChanges}>
                Cancel
              </Button>
              <Button
                onClick={onClose}
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-600/30 active:translate-y-0 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
