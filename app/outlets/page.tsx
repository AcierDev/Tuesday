"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Power, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Image from "next/image";

const API_BASE_URL = "http://everwoodbackend.ddns.net:3004";

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
    const response = await fetch(`${API_BASE_URL}/outlet/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ip, autoOffMinutes }),
      credentials: "include",
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
        devices[index].ip,
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
      setError(`Failed to ${action} ${devices[index].name}`);
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
      const response = await fetch(`${API_BASE_URL}/outlet/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ip: devices[index].ip }),
        credentials: "include",
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
      console.error(`Failed to get status for ${devices[index].name}:`, err);
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

  // Add the AutoOffSelect component
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
          <SelectValue placeholder="Auto-off timer">
            {getSelectedValue() === "0"
              ? "No auto-off"
              : `${getSelectedValue()} minutes`}
          </SelectValue>
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
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Remote Device Control
      </h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between mb-6">
        <Button
          variant="outline"
          className="dark:bg-white dark:text-black dark:hover:bg-white/80 dark:border-none flex items-center gap-2"
          onClick={() => handleControlAll("on")}
          disabled={refreshing.length > 0}
        >
          <Power className="h-4 w-4" />
          Turn All On
        </Button>

        <Button
          variant="outline"
          className="dark:bg-black/30 dark:hover:bg-black/40 dark:border-none flex items-center gap-2"
          onClick={() => handleControlAll("off")}
          disabled={refreshing.length > 0}
        >
          <Power className="h-4 w-4" />
          Turn All Off
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {devices.map((device, index) => {
          const deviceStatus = deviceStatuses[index] || {
            status: "unknown",
            lastChecked: 0,
          };
          const isRefreshing = refreshing.includes(index);

          return (
            <Card key={index} className="overflow-hidden">
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
                  <Badge
                    variant={
                      deviceStatus.status === "on" ? "default" : "secondary"
                    }
                  >
                    {deviceStatus.status === "unknown"
                      ? "Unknown"
                      : deviceStatus.status.toUpperCase()}
                  </Badge>
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

                  {deviceStatus.status === "on" && deviceStatus.autoOffAt && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Auto-off at:{" "}
                      {new Date(deviceStatus.autoOffAt).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center mt-6">
        <Button
          variant="outline"
          onClick={fetchAllStatuses}
          disabled={refreshing.length > 0}
          className="dark:bg-white/10 dark:hover:bg-white/20 dark:border-none flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh All Statuses
        </Button>
      </div>
    </div>
  );
}
