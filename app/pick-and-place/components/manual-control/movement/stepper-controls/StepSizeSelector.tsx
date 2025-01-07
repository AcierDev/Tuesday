import React, { useState } from "react";
import ChevronDown from "./ChevronDown";

const STEP_OPTIONS = [50, 100, 500, 1000] as const;
export type StepSize = (typeof STEP_OPTIONS)[number];

interface StepSizeSelectorProps {
  value: StepSize;
  onChange: (size: StepSize) => void;
}

const StepSizeSelector = ({ value, onChange }: StepSizeSelectorProps) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="flex items-center gap-8">
      <span className="w-6 text-lg font-medium text-gray-700 dark:text-gray-200">
        Step
      </span>
      <div className="relative">
        <div
          className="w-20 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white cursor-pointer flex items-center justify-between"
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          <span>{value}</span>
          <ChevronDown />
        </div>
        {showDropdown && (
          <>
            <div
              className="absolute h-2 w-full -bottom-2"
              onMouseEnter={() => setShowDropdown(true)}
            />
            <div
              className="absolute top-[calc(100%+0.5rem)] left-0 w-20 bg-white dark:bg-gray-700 rounded shadow-lg border dark:border-gray-600 py-1 z-10"
              onMouseEnter={() => setShowDropdown(true)}
              onMouseLeave={() => setShowDropdown(false)}
            >
              {STEP_OPTIONS.map((size) => (
                <div
                  key={size}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${
                    size === value ? "bg-gray-100 dark:bg-gray-600" : ""
                  }`}
                  onClick={() => {
                    onChange(size);
                    setShowDropdown(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StepSizeSelector;
