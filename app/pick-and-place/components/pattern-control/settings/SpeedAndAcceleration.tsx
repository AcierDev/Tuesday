import React, { useState } from "react";

const STORAGE_KEY = "pick-and-place-speed-accel";

interface SpeedAccelData {
  speed: number;
  acceleration: number;
}

const DEFAULT_SETTINGS: SpeedAccelData = {
  speed: 100,
  acceleration: 50,
};

// Get initial settings synchronously
const getInitialSettings = (): SpeedAccelData => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  const savedSettings = localStorage.getItem(STORAGE_KEY);
  return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
};

const SpeedAndAcceleration = () => {
  const [settings, setSettings] = useState<SpeedAccelData>(
    getInitialSettings()
  );

  // Save settings to localStorage whenever they change
  const updateSettings = (key: keyof SpeedAccelData, value: number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
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
            Speed
          </label>
          <input
            type="number"
            id="speed"
            min="0"
            value={settings.speed}
            onChange={(e) =>
              updateSettings("speed", parseInt(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="acceleration"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Acceleration
          </label>
          <input
            type="number"
            id="acceleration"
            min="0"
            value={settings.acceleration}
            onChange={(e) =>
              updateSettings("acceleration", parseInt(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
};

export default SpeedAndAcceleration;
