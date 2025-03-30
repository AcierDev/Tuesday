import React, { useState } from "react";
import { useWebSocket } from "../../../contexts/WebSocketContext";

const STORAGE_KEY = "pick-and-place-grid";

interface GridData {
  rows: number;
  columns: number;
}

const DEFAULT_SETTINGS: GridData = {
  rows: 5,
  columns: 7,
};

// Get initial settings synchronously
const getInitialSettings = (): GridData => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  const savedSettings = localStorage.getItem(STORAGE_KEY);
  return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
};

const Grid = () => {
  const { sendCommand } = useWebSocket();
  const [settings, setSettings] = useState<GridData>(getInitialSettings());

  // Save settings to localStorage and update pattern whenever they change
  const updateSettings = (key: keyof GridData, value: number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));

    // Send updated pattern settings to ESP32
    const startX = localStorage.getItem("pick-and-place-start-coordinates")
      ? JSON.parse(localStorage.getItem("pick-and-place-start-coordinates")!).x
      : 2;
    const startY = localStorage.getItem("pick-and-place-start-coordinates")
      ? JSON.parse(localStorage.getItem("pick-and-place-start-coordinates")!).y
      : 9;
    const endX = localStorage.getItem("pick-and-place-end-coordinates")
      ? JSON.parse(localStorage.getItem("pick-and-place-end-coordinates")!).x
      : 30.5;
    const endY = localStorage.getItem("pick-and-place-end-coordinates")
      ? JSON.parse(localStorage.getItem("pick-and-place-end-coordinates")!).y
      : 28.5;
    const pickupX = localStorage.getItem("pick-and-place-pickup-coordinates")
      ? JSON.parse(localStorage.getItem("pick-and-place-pickup-coordinates")!).x
      : 15.5;
    const pickupY = localStorage.getItem("pick-and-place-pickup-coordinates")
      ? JSON.parse(localStorage.getItem("pick-and-place-pickup-coordinates")!).y
      : 3.5;
    const speed = localStorage.getItem("pick-and-place-speed-accel")
      ? JSON.parse(localStorage.getItem("pick-and-place-speed-accel")!).speed
      : 7500;
    const accel = localStorage.getItem("pick-and-place-speed-accel")
      ? JSON.parse(localStorage.getItem("pick-and-place-speed-accel")!).accel
      : 50000;

    const command = `pattern start ${newSettings.rows} ${newSettings.columns} ${startX} ${startY} ${endX} ${endY} ${pickupX} ${pickupY} ${speed} ${accel}`;
    sendCommand(command);
  };

  return (
    <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
      <h3 className="text-lg font-medium dark:text-white mb-4">Grid</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="grid-rows"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Rows
          </label>
          <input
            type="number"
            id="grid-rows"
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
            htmlFor="grid-columns"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Columns
          </label>
          <input
            type="number"
            id="grid-columns"
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
