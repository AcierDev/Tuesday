import React from "react";

interface AxisControlsProps {
  onXDecrement: () => void;
  onXIncrement: () => void;
  onYDecrement: () => void;
  onYIncrement: () => void;
}

const AxisControls = ({
  onXDecrement,
  onXIncrement,
  onYDecrement,
  onYIncrement,
}: AxisControlsProps) => {
  return (
    <div className="relative">
      {/* Y Label */}
      <div className="absolute left-1/2 -top-6 -translate-x-1/2 text-lg font-medium text-gray-700 dark:text-gray-200">
        Y
      </div>

      {/* X Label */}
      <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-lg font-medium text-gray-700 dark:text-gray-200">
        X
      </div>

      <div className="inline-grid grid-cols-3 gap-2">
        {/* Top row */}
        <div className="col-span-1" />
        <button
          onClick={onYIncrement}
          className="w-12 h-12 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center"
        >
          ↑
        </button>
        <div className="col-span-1" />
        {/* Middle row */}
        <button
          onClick={onXDecrement}
          className="w-12 h-12 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center"
        >
          ←
        </button>
        <div className="w-12 h-12" /> {/* Empty space in middle */}
        <button
          onClick={onXIncrement}
          className="w-12 h-12 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center"
        >
          →
        </button>
        {/* Bottom row */}
        <div className="col-span-1" />
        <button
          onClick={onYDecrement}
          className="w-12 h-12 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center"
        >
          ↓
        </button>
        <div className="col-span-1" />
      </div>
    </div>
  );
};

export default AxisControls;
