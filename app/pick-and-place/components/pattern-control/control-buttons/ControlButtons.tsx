import React, { useState } from "react";
import { useWebSocket } from "../../../contexts/WebSocketContext";
import HomeTooltip from "./HomeTooltip";

const ControlButtons = () => {
  const { sendCommand } = useWebSocket();
  const [showHomeOptions, setShowHomeOptions] = useState(false);
  const [isHoming, setIsHoming] = useState(false);

  const handleHome = () => {
    if (isHoming) return;

    sendCommand("home");
  };

  const handleStartPattern = () => {
    // Get all settings from localStorage
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
    const { speed, accel } = JSON.parse(
      localStorage.getItem("pick-and-place-speed-accel") ||
        '{"speed":7500,"accel":50000}'
    );

    const command = `pattern start ${rows} ${columns} ${startX} ${startY} ${endX} ${endY} ${pickupX} ${pickupY} ${speed} ${accel}`;
    sendCommand(command);
  };

  const handleStopPattern = () => {
    sendCommand("pattern stop");
  };

  return (
    <div className="mb-6 p-6 rounded-lg bg-white shadow-md dark:bg-gray-700/20">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">Controls</h2>
      <div className="flex flex-col gap-4">
        <button
          onClick={handleStartPattern}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Start Pattern
        </button>
        <button
          onClick={handleStopPattern}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Stop Pattern
        </button>
        <div className="relative">
          <button
            onClick={handleHome}
            onMouseEnter={() => setShowHomeOptions(true)}
            onMouseLeave={() => setShowHomeOptions(false)}
            disabled={isHoming}
            className={`w-full px-4 py-2 text-white rounded transition-colors ${
              isHoming
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {isHoming ? "Homing..." : "Home"}
          </button>
          {showHomeOptions && (
            <HomeTooltip
              onMouseEnter={() => setShowHomeOptions(true)}
              onMouseLeave={() => setShowHomeOptions(false)}
              isHoming={isHoming}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlButtons;
