"use client";

import { Activity } from "@/typings/types";
import { useActivities } from "@/hooks/useActivities";
import { useEffect, useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function RecentActivityFeed({
  selectedEmployee,
}: {
  selectedEmployee: string | null;
}) {
  const getStatusBadgeStyle = (status: string) => {
    return status.toLowerCase() === "done"
      ? "text-green-600 dark:text-green-300 font-medium " +
          "bg-green-100 dark:bg-green-900/30 " +
          "border border-green-200 dark:border-green-800 " +
          "px-1.5 py-0.5 rounded-md text-sm"
      : "text-blue-600 dark:text-blue-300 font-medium " +
          "bg-blue-100 dark:bg-blue-900/30 " +
          "border border-blue-200 dark:border-blue-800 " +
          "px-1.5 py-0.5 rounded-md text-sm";
  };

  const { getActivities } = useActivities();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [currentTab, setCurrentTab] = useState("all");

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        const response = await getActivities(undefined);
        setActivities(response.activities || []);
      } catch (error) {
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (text: string, field?: string) => {
    const normalizedText = text.toLowerCase().trim();

    // Check for "none" first
    if (normalizedText === "none") {
      return "text-gray-500 italic";
    }

    // Return date styling if it's a date field
    if (field?.toLowerCase().includes("date")) {
      return "text-violet-600 font-mono";
    }

    // Return size styling if it's a size field
    if (field?.toLowerCase().includes("size")) {
      return "text-emerald-600 font-semibold";
    }

    // Return design styling if it's a design field
    if (field?.toLowerCase().includes("design")) {
      return "text-cyan-600 font-medium";
    }

    // Return customer name styling if it's a customer field
    if (field?.toLowerCase().includes("customer")) {
      return "text-indigo-600 font-medium";
    }

    // Return notes styling if it's a notes field
    if (field?.toLowerCase().includes("note")) {
      return "text-purple-600 dark:text-purple-400 font-normal italic";
    }

    // Return number styling if text is a number between 1-10
    if (/^([1-9]|10)$/.test(text.trim())) {
      return "text-amber-600 font-semibold";
    }

    switch (normalizedText) {
      case "done":
        return "text-green-500";
      case "working on it":
        return "text-yellow-500";
      case "stuck":
        return "text-red-500";
      case "didn't start":
        return "text-gray-400";
      default:
        return "text-gray-600";
    }
  };

  const getActivityDescription = (activity: Activity) => {
    const change = activity.changes?.[0];

    // Helper to format date values
    const formatValue = (value: string, field: string) => {
      if (field.toLowerCase().includes("date") && value) {
        return value.substring(0, 10);
      }
      return value;
    };

    switch (activity.type) {
      case "status_change":
        if (!change) {
          return <span>Unknown status change</span>;
        }
        return (
          <span>
            {change.isRestore ? "Restored" : "Changed"} status from{" "}
            <span className={getStatusBadgeStyle(change.oldValue || "none")}>
              {change.oldValue || "none"}
            </span>{" "}
            to{" "}
            <span className={getStatusBadgeStyle(change.newValue)}>
              {change.newValue}
            </span>
          </span>
        );
      case "update":
        if (!change) {
          return <span>Unknown update</span>;
        }
        return (
          <span>
            Updated{" "}
            <span className="text-orange-500 font-medium">
              {change.field.replace(/_/g, " ")}
            </span>{" "}
            from{" "}
            <span
              className={getStatusColor(
                change.oldValue || "none",
                change.field
              )}
            >
              {change.oldValue
                ? formatValue(change.oldValue, change.field)
                : "None"}
            </span>{" "}
            to{" "}
            <span className={getStatusColor(change.newValue, change.field)}>
              {formatValue(change.newValue, change.field)}
            </span>
          </span>
        );
      case "create":
        return (
          <span className="text-purple-600 dark:text-purple-400 font-medium">
            Created new order
          </span>
        );
      case "delete":
        return (
          <span className="text-red-600 dark:text-red-400 font-medium">
            Deleted order
          </span>
        );
      case "restore":
        return (
          <span className="text-green-600 dark:text-green-400 font-medium">
            Restored order
          </span>
        );
      default:
        return (
          <span className="text-gray-500 dark:text-gray-400 italic font-medium">
            Unknown activity
          </span>
        );
    }
  };

  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Apply employee filter first if selected
    if (selectedEmployee) {
      filtered = filtered.filter(
        (activity) => activity.userName === selectedEmployee
      );
    }

    // Then apply tab filtering
    switch (activeTab) {
      case "updates":
        filtered = filtered.filter((activity) => activity.type === "update");
        break;
      case "status":
        filtered = filtered.filter(
          (activity) => activity.type === "status_change"
        );
        break;
      case "deleted":
        filtered = filtered.filter(
          (activity) =>
            activity.type === "delete" || activity.type === "restore"
        );
        break;
      case "creations":
        filtered = filtered.filter((activity) => activity.type === "create");
        break;
    }

    // Sort activities by timestamp in descending order and take the first 10
    return filtered.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }, [activities, activeTab, selectedEmployee]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-500 text-sm">No Recent Activities</p>
      </div>
    );
  }

  const ActivityList = () => (
    <div className="space-y-4 pt-1">
      {filteredActivities.map((activity) => (
        <div key={activity.id} className="flex items-center space-x-4">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {getActivityDescription(activity)}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-xs text-gray-400">
                {activity.userName ? activity.userName : "Unknown User"}
              </p>
              <span className="text-gray-400">●</span>
              <p className="text-xs text-gray-400">
                {new Date(activity.timestamp).toLocaleString()}
              </p>
            </div>
            {activity.metadata && (
              <p className="text-xs text-gray-500 mt-1">
                {activity.metadata.customerName} - {activity.metadata.design} (
                {activity.metadata.size})
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Tabs
      defaultValue={currentTab}
      className="w-full"
      onValueChange={(value) => {
        setActiveTab(value);
        setCurrentTab(value);
      }}
    >
      <TabsList className="grid w-full grid-cols-5 mb-4">
        <TabsTrigger
          value="all"
          className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
        >
          All
        </TabsTrigger>
        <TabsTrigger
          value="updates"
          className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
        >
          Updates
        </TabsTrigger>
        <TabsTrigger
          value="status"
          className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
        >
          Status Changes
        </TabsTrigger>
        <TabsTrigger
          value="deleted"
          className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
        >
          Deleted
        </TabsTrigger>
        <TabsTrigger
          value="creations"
          className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
        >
          Creations
        </TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="mt-0">
        <ActivityList />
      </TabsContent>
      <TabsContent value="updates" className="mt-0">
        <ActivityList />
      </TabsContent>
      <TabsContent value="status" className="mt-0">
        <ActivityList />
      </TabsContent>
      <TabsContent value="deleted" className="mt-0">
        <ActivityList />
      </TabsContent>
      <TabsContent value="creations" className="mt-0">
        <ActivityList />
      </TabsContent>
    </Tabs>
  );
}
