import React from "react";
import { useWebSocket } from "../../../contexts/WebSocketContext";

const PresetButtons = () => {
  const { sendCommand } = useWebSocket();

  const handleZero = () => {
    const speed = 7500;
    const accel = 50000;
    sendCommand(`goto 0 0 ${speed} ${accel}`);
  };

  const handlePickup = () => {
    const speed = 7500;
    const accel = 50000;
    const pickupX = 15.5; // Default value from ESP32 code
    const pickupY = 3.5; // Default value from ESP32 code
    sendCommand(`goto ${pickupX} ${pickupY} ${speed} ${accel}`);
  };

  return (
    <div className="flex gap-4">
      <button
        onClick={handleZero}
        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Zero
      </button>
      <button
        onClick={handlePickup}
        className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
      >
        Pickup
      </button>
    </div>
  );
};

export default PresetButtons;
