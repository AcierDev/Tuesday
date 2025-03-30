import React, { useState } from "react";
import { useWebSocket } from "../../../contexts/WebSocketContext";

const GoToControls = () => {
  const { sendCommand } = useWebSocket();
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });

  const handleGoto = () => {
    const speed = 7500;
    const accel = 50000;
    sendCommand(`goto ${coordinates.x} ${coordinates.y} ${speed} ${accel}`);
  };

  return (
    <div className="flex items-end gap-4">
      <button
        onClick={handleGoto}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Go to:
      </button>
      <div className="flex gap-4 flex-1">
        <div className="flex-1 space-y-1">
          <label
            htmlFor="goto-x"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            X
          </label>
          <input
            type="number"
            id="goto-x"
            value={coordinates.x}
            onChange={(e) =>
              setCoordinates((prev) => ({
                ...prev,
                x: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            step="0.5"
          />
        </div>
        <div className="flex-1 space-y-1">
          <label
            htmlFor="goto-y"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Y
          </label>
          <input
            type="number"
            id="goto-y"
            value={coordinates.y}
            onChange={(e) =>
              setCoordinates((prev) => ({
                ...prev,
                y: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            step="0.5"
          />
        </div>
      </div>
    </div>
  );
};

export default GoToControls;
