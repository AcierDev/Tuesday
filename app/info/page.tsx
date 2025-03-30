"use client";

import { useEffect, useState } from "react";

export default function InfoPage() {
  const [ip, setIp] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [nextUpdateIn, setNextUpdateIn] = useState(30);
  const isDevelopment = process.env.NODE_ENV === "development";

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/heartbeat");
        const data = await response.json();

        if (data.ip === "No recent heartbeat received") {
          setIsConnected(false);
          setIp(null);
          setLastUpdate(null);
        } else {
          setIp(data.ip);
          setLastUpdate(new Date(data.lastUpdate));
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Failed to check warehouse status:", error);
        setIsConnected(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!lastUpdate) return;

    const updateCounter = () => {
      const secondsSinceUpdate = Math.floor(
        (new Date().getTime() - lastUpdate.getTime()) / 1000
      );
      setNextUpdateIn(Math.max(0, 30 - secondsSinceUpdate));
    };

    updateCounter(); // Initial update
    const timer = setInterval(updateCounter, 1000);

    return () => clearInterval(timer);
  }, [lastUpdate]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Warehouse Information</h1>

      {isDevelopment && (
        <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
          ⚠️ Development Mode - You're seeing local development IPs
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Connection Status</h2>
          <div className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full mr-2 ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Current IP Address</h2>
          <p className="text-xl font-mono">{ip || "Loading..."}</p>
          <p className="text-sm text-gray-500 mt-1">
            {ip === "::1"
              ? "This is the IPv6 loopback address (localhost)"
              : ip?.startsWith("127.")
              ? "This is a loopback address (localhost)"
              : "This is the warehouse's external IP address"}
          </p>
        </div>

        {lastUpdate && (
          <div className="text-sm text-gray-500 border-t dark:border-gray-700 pt-4 mt-4">
            Last updated: {lastUpdate.toLocaleString()}
            <br />
            Next update in: {nextUpdateIn} seconds
          </div>
        )}
      </div>
    </div>
  );
}
