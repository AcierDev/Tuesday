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
    <Card className="w-full max-w-4xl mx-auto shadow-lg dark:bg-gray-900">
      <CardHeader>
        <CardTitle className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Table Configuration
        </CardTitle>
        <CardDescription>
          Customize your table view and manage column visibility
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="columns" className="w-full">
          <TabsList className="grid w-full grid-cols-2 dark:bg-gray-800">
            <TabsTrigger value="columns">Column Visibility</TabsTrigger>
            <TabsTrigger value="general">General Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle>General Options</CardTitle>
                <CardDescription>Adjust general table settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-secondary rounded-lg dark:bg-gray-700">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="show-sorting-icons"
                      className="text-base font-medium"
                    >
                      Sorting Icons
                    </Label>
                    <p className="text-sm text-muted-foreground">
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
          <TabsContent value="columns">
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Columns className="w-5 h-5" />
                  Column Visibility
                </CardTitle>
                <CardDescription>
                  Manage visible columns for each item group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.values(ItemStatus).map((group) => (
                    <div
                      key={group}
                      className="border rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleGroupExpansion(group)}
                        className="w-full p-4 text-left bg-secondary hover:bg-secondary/80 transition-colors flex justify-between items-center dark:bg-gray-900"
                      >
                        <span className="text-lg font-semibold">
                          {group} Items
                        </span>
                        {expandedGroup === group ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
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
                            <div className="p-4 bg-card dark:bg-gray-700">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                  "Shipping",
                                  ...Object.values(ColumnTitles).filter(
                                    (field) => field !== "Shipping"
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
                                      className="text-sm font-medium cursor-pointer"
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
