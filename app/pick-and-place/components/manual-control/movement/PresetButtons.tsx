import React from "react";

const PresetButtons = () => {
  return (
    <div className="flex gap-4">
      <button className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
        Zero
      </button>
      <button className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
        Pickup
      </button>
    </div>
  );
};

export default PresetButtons;
