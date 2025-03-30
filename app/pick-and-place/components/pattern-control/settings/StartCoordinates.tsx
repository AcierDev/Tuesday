import React, { useState } from "react";
import { useWebSocket } from "../../../contexts/WebSocketContext";

const STORAGE_KEY = "pick-and-place-start-coordinates";

interface StartCoordinatesData {
  x: number;
  y: number;
}

const DEFAULT_SETTINGS: StartCoordinatesData = {
  x: 2,
  y: 9,
};

const getInitialSettings = (): StartCoordinatesData => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const savedSettings = localStorage.getItem(STORAGE_KEY);
  return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
};

const StartCoordinates = () => {
  const { sendCommand } = useWebSocket();
  const [settings, setSettings] = useState<StartCoordinatesData>(
    getInitialSettings()
  );

  const updateSettings = (key: keyof StartCoordinatesData, value: number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));

    // Get other settings from localStorage
    const { rows, columns } = JSON.parse(
      localStorage.getItem("pick-and-place-grid") || '{"rows":5,"columns":7}'
    );
    const { x: endX, y: endY } = JSON.parse(
      localStorage.getItem("pick-and-place-end-coordinates") ||
        '{"x":30.5,"y":28.5}'
    );
    const { x: pickupX, y: pickupY } = JSON.parse(
      localStorage.getItem("pick-and-place-pickup-coordinates") ||
        '{"x":15.5,"y":3.5}'
    );
    const { speed, accel } = JSON.parse(
      localStorage.getItem("pick-and-place-speed-accel") ||
        '{"speed":7500,"accel":50000}'
    );

    const command = `pattern start ${rows} ${columns} ${newSettings.x} ${newSettings.y} ${endX} ${endY} ${pickupX} ${pickupY} ${speed} ${accel}`;
    sendCommand(command);
  };

  return (
    <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
      <h3 className="text-lg font-medium dark:text-white mb-4">
        Start Coordinates
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="start-x"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            X
          </label>
          <input
            type="number"
            id="start-x"
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
            htmlFor="start-y"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Y
          </label>
          <input
            type="number"
            id="start-y"
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

export default StartCoordinates;
