"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemStatus, ColumnTitles } from "@/typings/types";
import { FRONTEND_HIDDEN_COLUMN_TITLES } from "@/typings/constants";
import { Settings, Columns, ChevronDown, ChevronUp } from "lucide-react";

interface ColumnVisibilitySettingsProps {
  columnVisibility: Record<string, Record<string, boolean>>;
  showSortingIcons: boolean;
  updateSettings: (updates: Partial<any>) => void;
  updateColumnVisibility: (
    group: string,
    field: string,
    visible: boolean
  ) => void;
}

export function ColumnVisibilitySettings({
  columnVisibility,
  showSortingIcons,
  updateSettings,
  updateColumnVisibility,
}: ColumnVisibilitySettingsProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const toggleColumnVisibility = (group: string, field: string) => {
    updateColumnVisibility(group, field, !columnVisibility[group]?.[field]);
  };

  const toggleGroupExpansion = (group: string) => {
    setExpandedGroup(expandedGroup === group ? null : group);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-sm dark:bg-gray-900">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Table Configuration
        </CardTitle>
        <CardDescription className="text-xs">
          Customize your table view and manage column visibility
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Tabs defaultValue="columns" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9 dark:bg-gray-800">
            <TabsTrigger value="columns" className="text-xs">Column Visibility</TabsTrigger>
            <TabsTrigger value="general" className="text-xs">General Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="mt-3">
            <Card className="dark:bg-gray-800">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm font-semibold">General Options</CardTitle>
                <CardDescription className="text-xs">Adjust general table settings</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="flex items-center justify-between p-3 bg-secondary rounded-md dark:bg-gray-700">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="show-sorting-icons"
                      className="text-sm font-medium"
                    >
                      Sorting Icons
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Display icons for sortable columns
                    </p>
                  </div>
                  <Switch
                    checked={showSortingIcons}
                    id="show-sorting-icons"
                    onCheckedChange={(checked) => {
                      updateSettings({ showSortingIcons: checked });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="columns" className="mt-3">
            <Card className="dark:bg-gray-800">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Columns className="w-4 h-4" />
                  Column Visibility
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage visible columns for each item group
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-2">
                  {Object.values(ItemStatus).map((group) => (
                    <div
                      key={group}
                      className="border rounded-md overflow-hidden"
                    >
                      <button
                        onClick={() => toggleGroupExpansion(group)}
                        className="w-full px-3 py-2 text-left bg-secondary hover:bg-secondary/80 transition-colors flex justify-between items-center dark:bg-gray-900"
                      >
                        <span className="text-sm font-semibold">
                          {group} Items
                        </span>
                        {expandedGroup === group ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <AnimatePresence>
                        {expandedGroup === group && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="p-3 bg-card dark:bg-gray-700">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {/*
                                  FRONTEND-ONLY HIDE: columns listed in
                                  FRONTEND_HIDDEN_COLUMN_TITLES (Painted,
                                  Backboard, Boxes, Glued, Notes, Rating) are
                                  filtered out so users cannot toggle them
                                  here. The underlying data/types are
                                  unchanged for backwards compatibility.
                                */}
                                {[
                                  "Shipping",
                                  ...Object.values(ColumnTitles).filter(
                                    (field) =>
                                      field !== "Shipping" &&
                                      !FRONTEND_HIDDEN_COLUMN_TITLES.has(
                                        field as ColumnTitles
                                      )
                                  ),
                                ].map((field) => (
                                  <div
                                    key={field}
                                    className="flex items-center space-x-3"
                                  >
                                    <Checkbox
                                      checked={columnVisibility[group]?.[field]}
                                      id={`${group}-${field}`}
                                      onCheckedChange={() =>
                                        toggleColumnVisibility(group, field)
                                      }
                                    />
                                    <Label
                                      htmlFor={`${group}-${field}`}
                                      className="text-xs font-medium cursor-pointer"
                                    >
                                      {field}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
