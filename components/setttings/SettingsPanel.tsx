"use client";

import {
  X,
  Moon,
  Sun,
  Settings,
  Columns,
  Clock,
  Group,
  Edit,
  UserCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AutomatronSettings } from "./AutomatronSettings";
import { ColumnVisibilitySettings } from "./ColumnVisibilitySettings";
import { DueBadgeSettings } from "./DueBadgeSettings";
import { RecentEditsSettings } from "./RecentEditsSettings";
import { GroupingSettings } from "./GroupSettings";
import { IdentificationMenuSettings } from "./IdentificationMenuSettings";

import { OrderSettings } from "@/typings/types";

interface SettingsPanelProps {
  settings: OrderSettings;
  updateSettings: (newSettings: Partial<OrderSettings>) => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  updateSettings,
  onClose,
}) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

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
        className="bg-background text-foreground rounded-lg shadow-lg w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col dark:bg-gray-800"
      >
        <Tabs defaultValue="automatron" className="flex flex-col h-full">
          <div className="flex flex-grow overflow-hidden">
            <TabsList className="h-full w-64 flex-shrink-0 flex flex-col items-stretch space-y-1 rounded-tl-lg border-r bg-muted p-4 dark:bg-gray-900">
              <TabsTrigger
                value="automatron"
                className="justify-start py-2 px-3 text-sm font-medium rounded-md transition-colors hover:bg-primary/10 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                <Settings className="w-4 h-4 mr-2" />
                Automatron
              </TabsTrigger>
              <TabsTrigger
                value="columns"
                className="justify-start py-2 px-3 text-sm font-medium rounded-md transition-colors hover:bg-primary/10 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                <Columns className="w-4 h-4 mr-2" />
                Column Visibility
              </TabsTrigger>
              <TabsTrigger
                value="due-badge"
                className="justify-start py-2 px-3 text-sm font-medium rounded-md transition-colors hover:bg-primary/10 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                <Clock className="w-4 h-4 mr-2" />
                Due Badge
              </TabsTrigger>
              <TabsTrigger
                value="grouping"
                className="justify-start py-2 px-3 text-sm font-medium rounded-md transition-colors hover:bg-primary/10 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                <Group className="w-4 h-4 mr-2" />
                Grouping
              </TabsTrigger>
              <TabsTrigger
                value="recent-edits"
                className="justify-start py-2 px-3 text-sm font-medium rounded-md transition-colors hover:bg-primary/10 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                <Edit className="w-4 h-4 mr-2" />
                Recent Edits
              </TabsTrigger>
              <TabsTrigger
                value="identification"
                className="justify-start py-2 px-3 text-sm font-medium rounded-md transition-colors hover:bg-primary/10 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                <UserCircle className="w-4 h-4 mr-2" />
                Identification Menu
              </TabsTrigger>
            </TabsList>
            <div className="flex-grow overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Settings</h2>
                <div className="flex items-center space-x-4">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                  >
                    {theme === "dark" ? (
                      <Sun className="h-5 w-5" />
                    ) : (
                      <Moon className="h-5 w-5" />
                    )}
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={onClose}>
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>
              </div>
              <TabsContent value="automatron">
                <AutomatronSettings
                  automatronRules={settings.automatronRules}
                  isAutomatronActive={settings.isAutomatronActive}
                  updateSettings={updateSettings}
                />
              </TabsContent>
              <TabsContent value="columns">
                <ColumnVisibilitySettings
                  columnVisibility={settings.columnVisibility}
                  showSortingIcons={settings.showSortingIcons}
                  updateSettings={updateSettings}
                  updateColumnVisibility={(group, field, isVisible) =>
                    updateSettings({
                      columnVisibility: {
                        ...settings.columnVisibility,
                        [group]: {
                          ...settings.columnVisibility[group],
                          [field]: isVisible,
                        },
                      },
                    })
                  }
                />
              </TabsContent>
              <TabsContent value="due-badge">
                <DueBadgeSettings
                  dueBadgeDays={settings.dueBadgeDays}
                  updateSettings={updateSettings}
                />
              </TabsContent>
              <TabsContent value="grouping">
                <GroupingSettings
                  groupingField={settings.groupingField}
                  showCompletedOrders={settings.showCompletedOrders}
                  updateSettings={updateSettings}
                />
              </TabsContent>
              <TabsContent value="recent-edits">
                <RecentEditsSettings
                  recentEditHours={settings.recentEditHours}
                  updateSettings={updateSettings}
                />
              </TabsContent>
              <TabsContent value="identification">
                <IdentificationMenuSettings
                  idleTimeout={settings.idleTimeout}
                  isIdleTimeoutEnabled={settings.isIdleTimeoutEnabled}
                  showIdentificationMenuForAdmins={
                    settings.showIdentificationMenuForAdmins
                  }
                  updateSettings={updateSettings}
                />
              </TabsContent>
            </div>
          </div>
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
        </Tabs>
      </div>
    </div>
  );
};
