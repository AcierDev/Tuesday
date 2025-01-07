import React, { useState } from "react";
import HomeTooltip from "./HomeTooltip";

const ControlButtons = () => {
  const [showHomeOptions, setShowHomeOptions] = useState(false);

  return (
    <div className="mb-6 p-6 rounded-lg bg-white shadow-md dark:bg-gray-700/20">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">Controls</h2>
      <div className="flex flex-col gap-4">
        <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
          Start Pattern
        </button>
        <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
          Stop Pattern
        </button>
        <div className="relative">
          <button
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onMouseEnter={() => setShowHomeOptions(true)}
            onMouseLeave={() => setShowHomeOptions(false)}
          >
            Home
          </button>
          {showHomeOptions && (
            <HomeTooltip
              onMouseEnter={() => setShowHomeOptions(true)}
              onMouseLeave={() => setShowHomeOptions(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlButtons;
