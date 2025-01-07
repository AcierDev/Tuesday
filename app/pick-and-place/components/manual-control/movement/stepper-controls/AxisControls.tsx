import React from "react";

interface AxisControlsProps {
  axis: "X" | "Y";
  onDecrement: () => void;
  onIncrement: () => void;
}

const AxisControls = ({
  axis,
  onDecrement,
  onIncrement,
}: AxisControlsProps) => {
  return (
    <div className="flex items-center gap-4">
      <span className="w-6 text-lg font-medium text-gray-700 dark:text-gray-200">
        {axis}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onDecrement}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          ←
        </button>
        <button
          onClick={onIncrement}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
};

export default AxisControls;
