import React, { useState } from "react";
import { useWebSocket } from "../../../contexts/WebSocketContext";

const STORAGE_KEY = "pick-and-place-speed-accel";

interface SpeedAccelData {
  speed: number;
  accel: number;
}

const DEFAULT_SETTINGS: SpeedAccelData = {
  speed: 7500,
  accel: 50000,
};

const getInitialSettings = (): SpeedAccelData => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const savedSettings = localStorage.getItem(STORAGE_KEY);
  return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
};

const SpeedAndAcceleration = () => {
  const { sendCommand } = useWebSocket();
  const [settings, setSettings] = useState<SpeedAccelData>(
    getInitialSettings()
  );

  const updateSettings = (key: keyof SpeedAccelData, value: number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));

    // Get other settings from localStorage
    const { rows, columns } = JSON.parse(
      localStorage.getItem("pick-and-place-grid") || '{"rows":5,"columns":7}'
    );
    const { x: startX, y: startY } = JSON.parse(
      localStorage.getItem("pick-and-place-start-coordinates") ||
        '{"x":2,"y":9}'
    );
    const { x: endX, y: endY } = JSON.parse(
      localStorage.getItem("pick-and-place-end-coordinates") ||
        '{"x":30.5,"y":28.5}'
    );
    const { x: pickupX, y: pickupY } = JSON.parse(
      localStorage.getItem("pick-and-place-pickup-coordinates") ||
        '{"x":15.5,"y":3.5}'
    );

    const command = `pattern start ${rows} ${columns} ${startX} ${startY} ${endX} ${endY} ${pickupX} ${pickupY} ${newSettings.speed} ${newSettings.accel}`;
    sendCommand(command);
  };

  return (
    <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
      <h3 className="text-lg font-medium dark:text-white mb-4">
        Speed & Acceleration
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="speed"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Speed (steps/sec)
          </label>
          <input
            type="number"
            id="speed"
            min="1"
            value={settings.speed}
            onChange={(e) =>
              updateSettings("speed", parseInt(e.target.value) || 1)
            }
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="accel"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Acceleration (steps/sec²)
          </label>
          <input
            type="number"
            id="accel"
            min="1"
            value={settings.accel}
            onChange={(e) =>
              updateSettings("accel", parseInt(e.target.value) || 1)
            }
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
};

export default SpeedAndAcceleration;
