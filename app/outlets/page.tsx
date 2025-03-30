"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Power, RefreshCw, LayoutGrid, List } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock } from "lucide-react";

const API_BASE_URL = "/api/outlets";

interface Device {
  name: string;
  ip: string;
  icon: string;
  autoOffMinutes?: number;
}

interface DeviceStatus {
  status: "on" | "off" | "unknown";
  lastChecked: number;
  autoOffAt?: number;
}

interface DeviceGroup {
  name: string;
  devices: number[];
}

// Type guard for checking if index exists in devices array
const isValidDeviceIndex = (devices: Device[], index: number): boolean => {
  return index >= 0 && index < devices.length;
};

const controlOutlet = async (
  ip: string,
  action: "on" | "off",
  autoOffMinutes?: number
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ip, autoOffMinutes }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return true;
  } catch (error) {
    console.error("Error controlling outlet:", error);
    return false;
  }
};

export default function OutletControl() {
  const [deviceStatuses, setDeviceStatuses] = useState<
    Record<number, DeviceStatus>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(false);

  const devices: Device[] = [
    {
      name: "New Compressor",
      ip: "192.168.1.182",
      icon: "/icons/air-compressor.png",
    },
    {
      name: "Old Compressor",
      ip: "192.168.1.183",
      icon: "/icons/air-compressor.png",
    },
    { name: "Paint Lights", ip: "192.168.1.184", icon: "/icons/led.png" },
    { name: "Paint AC", ip: "192.168.1.211", icon: "/icons/portable-ac.png" },
    { name: "Stage 1 Lights", ip: "192.168.1.185", icon: "/icons/led.png" },
    {
      name: "Stage 1 Compressor",
      ip: "192.168.1.203",
      icon: "/icons/small-compressor.png",
    },
    { name: "Stage 1 Motor", ip: "192.168.1.204", icon: "/icons/stepper.png" },
  ];

  const deviceGroups: DeviceGroup[] = [
    {
      name: "Compressors",
      devices: [0, 1, 5],
    },
    {
      name: "Lighting",
      devices: [2, 4],
    },
    {
      name: "Climate Control",
      devices: [3],
    },
    {
      name: "Motors",
      devices: [6],
    },
  ];

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeGroup, setActiveGroup] = useState<string>("all");

  const handleControl = async (
    index: number,
    action: "on" | "off",
    autoOffMinutes?: number
  ) => {
    if (!isValidDeviceIndex(devices, index)) return;

    setError(null);
    setRefreshing((prev) => [...prev, index]);
    try {
      const success = await controlOutlet(
        devices[index]!.ip,
        action,
        autoOffMinutes
      );
      if (success) {
        setDeviceStatuses((prev) => ({
          ...prev,
          [index]: {
            status: action,
            lastChecked: Date.now(),
            autoOffAt: autoOffMinutes
              ? Date.now() + autoOffMinutes * 60 * 1000
              : undefined,
          },
        }));
      } else {
        throw new Error("Failed to control device");
      }
    } catch (err) {
      setError(`Failed to ${action} ${devices[index]!.name}`);
    } finally {
      setRefreshing((prev) => prev.filter((i) => i !== index));
    }
  };

  const handleControlAll = async (action: "on" | "off") => {
    setError(null);
    setRefreshing(devices.map((_, i) => i));
    try {
      const results = await Promise.all(
        devices.map((device) => controlOutlet(device.ip, action))
      );

      if (mountedRef.current) {
        setDeviceStatuses((prev) => ({
          ...prev,
          ...Object.fromEntries(
            devices.map((_, index) => [
              index,
              {
                status: results[index] ? action : "unknown",
                lastChecked: Date.now(),
                autoOffAt: undefined,
              },
            ])
          ),
        }));
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(`Failed to ${action} all devices`);
        console.error(err);
      }
    } finally {
      if (mountedRef.current) {
        setRefreshing([]);
      }
    }
  };

  const getOutletStatus = useCallback(async (index: number) => {
    if (!mountedRef.current || !isValidDeviceIndex(devices, index)) return;

    setRefreshing((prev) => [...prev, index]);
    try {
      const response = await fetch(`${API_BASE_URL}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ip: devices[index]!.ip }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (mountedRef.current) {
        setDeviceStatuses((prev) => ({
          ...prev,
          [index]: {
            status: data.status ?? "unknown",
            lastChecked: Date.now(),
            autoOffAt: data.autoOffAt,
          },
        }));
      }
    } catch (err) {
      console.error(`Failed to get status for ${devices[index]!.name}:`, err);
      if (mountedRef.current) {
        setDeviceStatuses((prev) => ({
          ...prev,
          [index]: {
            status: "unknown",
            lastChecked: Date.now(),
          },
        }));
      }
    } finally {
      if (mountedRef.current) {
        setRefreshing((prev) => prev.filter((i) => i !== index));
      }
    }
  }, []);

  const fetchAllStatuses = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all(devices.map((_, index) => getOutletStatus(index)));
    } catch (err) {
      if (mountedRef.current) {
        setError("Failed to fetch statuses for all devices");
        console.error(err);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [getOutletStatus]);

  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch
    fetchAllStatuses();

    // Set up interval for periodic updates
    const intervalId = setInterval(fetchAllStatuses, 30000);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchAllStatuses]);

  const StatusIndicator = ({
    status,
    lastChecked,
  }: {
    status: string;
    lastChecked: number;
  }) => {
    const getStatusColor = () => {
      switch (status) {
        case "on":
          return "bg-green-500";
        case "off":
          return "bg-red-500";
        default:
          return "bg-gray-500";
      }
    };

    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}
            />
            <span className="text-sm font-medium capitalize">{status}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          Last updated: {new Date(lastChecked).toLocaleTimeString()}
        </TooltipContent>
      </Tooltip>
    );
  };

  const AutoOffSelect = ({ index }: { index: number }) => {
    const deviceStatus = deviceStatuses[index];
    const getSelectedValue = () => {
      if (!deviceStatus?.autoOffAt) return "0";
      const remainingMinutes = Math.round(
        (deviceStatus.autoOffAt - Date.now()) / (60 * 1000)
      );
      // Map to closest available option
      const options = [30, 60, 120, 240, 480];
      const selectedOption = options.find(
        (opt) => Math.abs(remainingMinutes - opt) < opt * 0.1
      );
      return selectedOption?.toString() || "0";
    };

    return (
      <div className="flex flex-col gap-2">
        <Select
          value={getSelectedValue()}
          onValueChange={(value) => {
            const minutes = parseInt(value);
            if (minutes > 0) {
              handleControl(index, "on", minutes);
            } else {
              handleControl(index, "on");
            }
          }}
        >
          <SelectTrigger className="w-[180px] dark:bg-white/20 dark:border-none">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <SelectValue placeholder="Auto-off timer">
                {getSelectedValue() === "0"
                  ? "No auto-off"
                  : `${getSelectedValue()} minutes`}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-600 dark:border-none">
            <SelectItem value="0">No auto-off</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="60">1 hour</SelectItem>
            <SelectItem value="120">2 hours</SelectItem>
            <SelectItem value="240">4 hours</SelectItem>
            <SelectItem value="480">8 hours</SelectItem>
          </SelectContent>
        </Select>
        {deviceStatus?.autoOffAt && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Turns off at {new Date(deviceStatus.autoOffAt).toLocaleTimeString()}
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Remote Device Control</h1>
          <div className="flex items-center gap-4">
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "grid" | "list")}
            >
              <TabsList className="dark:bg-gray-800">
                <TabsTrigger value="grid" className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" /> Grid
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" /> List
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="dark:bg-gray-800">
                  {activeGroup === "all" ? "All Devices" : activeGroup}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="dark:bg-gray-800">
                <DropdownMenuItem onClick={() => setActiveGroup("all")}>
                  All Devices
                </DropdownMenuItem>
                {deviceGroups.map((group) => (
                  <DropdownMenuItem
                    key={group.name}
                    onClick={() => setActiveGroup(group.name)}
                  >
                    {group.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="dark:bg-white dark:text-black dark:hover:bg-white/80"
                onClick={() => handleControlAll("on")}
                disabled={refreshing.length > 0}
              >
                <Power className="h-4 w-4 mr-2" />
                Turn All On
              </Button>
              <Button
                variant="outline"
                className="dark:bg-black/30 dark:hover:bg-black/40"
                onClick={() => handleControlAll("off")}
                disabled={refreshing.length > 0}
              >
                <Power className="h-4 w-4 mr-2" />
                Turn All Off
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={fetchAllStatuses}
              disabled={refreshing.length > 0}
              className="dark:hover:bg-white/10"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Device Grid/List */}
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "flex flex-col gap-4"
          }
        >
          {devices
            .filter(
              (_, index) =>
                activeGroup === "all" ||
                deviceGroups
                  .find((g) => g.name === activeGroup)
                  ?.devices.includes(index)
            )
            .map((device, index) => {
              const deviceStatus = deviceStatuses[index] || {
                status: "unknown",
                lastChecked: 0,
              };
              const isRefreshing = refreshing.includes(index);

              return (
                <Card key={index} className="overflow-hidden dark:bg-red-700">
                  <CardHeader className="bg-secondary bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Image
                          src={device.icon}
                          alt={device.name}
                          width={48}
                          height={48}
                          className="dark:invert"
                        />
                        <div>
                          <CardTitle>{device.name}</CardTitle>
                          <CardDescription>IP: {device.ip}</CardDescription>
                        </div>
                      </div>
                      <StatusIndicator
                        status={deviceStatus.status}
                        lastChecked={deviceStatus.lastChecked}
                      />
                    </div>
                  </CardHeader>
                  <CardContent
                    className={`pt-6 ${
                      deviceStatus.status === "on"
                        ? "bg-green-300 dark:bg-green-700"
                        : "bg-red-300 dark:bg-red-700"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Power</span>
                        <Switch
                          checked={deviceStatus.status === "on"}
                          onCheckedChange={(checked) =>
                            handleControl(index, checked ? "on" : "off")
                          }
                          disabled={isRefreshing}
                        />
                      </div>

                      {deviceStatus.status === "on" && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Auto-off Timer</span>
                          <AutoOffSelect index={index} />
                        </div>
                      )}

                      {deviceStatus.status === "on" &&
                        deviceStatus.autoOffAt && (
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            Auto-off at:{" "}
                            {new Date(
                              deviceStatus.autoOffAt
                            ).toLocaleTimeString()}
                          </div>
                        )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>
    </TooltipProvider>
  );
}
