import React from "react";

interface AxisControlsProps {
  onXDecrement: () => void;
  onXIncrement: () => void;
  onYDecrement: () => void;
  onYIncrement: () => void;
  onHome: () => void;
}

const AxisControls = ({
  onXDecrement,
  onXIncrement,
  onYDecrement,
  onYIncrement,
  onHome,
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
        <button
          onClick={onHome}
          className="w-12 h-12 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </button>
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
