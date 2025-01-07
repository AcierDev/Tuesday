import React, { useState } from "react";

const STORAGE_KEY = "pick-and-place-grid-settings";

interface GridSettingsData {
  rows: number;
  columns: number;
}

const DEFAULT_SETTINGS: GridSettingsData = {
  rows: 1,
  columns: 1,
};

// Get initial settings synchronously
const getInitialSettings = (): GridSettingsData => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  const savedSettings = localStorage.getItem(STORAGE_KEY);
  return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
};

const Grid = () => {
  const [settings, setSettings] = useState<GridSettingsData>(
    getInitialSettings()
  );

  // Save settings to localStorage whenever they change
  const updateSettings = (key: keyof GridSettingsData, value: number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  };

  return (
    <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
      <h3 className="text-lg font-medium dark:text-white mb-4">Grid</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="rows"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Rows
          </label>
          <input
            type="number"
            id="rows"
            min="1"
            value={settings.rows}
            onChange={(e) =>
              updateSettings("rows", parseInt(e.target.value) || 1)
            }
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="columns"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Columns
          </label>
          <input
            type="number"
            id="columns"
            min="1"
            value={settings.columns}
            onChange={(e) =>
              updateSettings("columns", parseInt(e.target.value) || 1)
            }
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
};

export default Grid;
