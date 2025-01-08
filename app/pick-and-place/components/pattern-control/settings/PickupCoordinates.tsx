import React, { useState } from "react";

const STORAGE_KEY = "pick-and-place-pickup-coordinates";

interface PickupCoordinatesData {
  x: number;
  y: number;
}

const DEFAULT_SETTINGS: PickupCoordinatesData = {
  x: 0,
  y: 0,
};

// Get initial settings synchronously
const getInitialSettings = (): PickupCoordinatesData => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  const savedSettings = localStorage.getItem(STORAGE_KEY);
  return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
};

const PickupCoordinates = () => {
  const [settings, setSettings] = useState<PickupCoordinatesData>(
    getInitialSettings()
  );

  // Save settings to localStorage whenever they change
  const updateSettings = (key: keyof PickupCoordinatesData, value: number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  };

  return (
    <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
      <h3 className="text-lg font-medium dark:text-white mb-4">
        Pickup Coordinates
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="pickup-x"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            X
          </label>
          <input
            type="number"
            id="pickup-x"
            step="0.5"
            value={settings.x}
            onChange={(e) =>
              updateSettings("x", parseFloat(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="pickup-y"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Y
          </label>
          <input
            type="number"
            id="pickup-y"
            step="0.5"
            value={settings.y}
            onChange={(e) =>
              updateSettings("y", parseFloat(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
};

export default PickupCoordinates;
