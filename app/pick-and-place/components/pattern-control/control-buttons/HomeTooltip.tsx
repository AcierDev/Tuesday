import React from "react";

interface HomeTooltipProps {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const HomeTooltip = ({ onMouseEnter, onMouseLeave }: HomeTooltipProps) => {
  return (
    <>
      <div
        className="absolute h-2 w-full -bottom-2"
        onMouseEnter={onMouseEnter}
      />
      <div
        className="absolute top-[calc(100%+0.25rem)] left-1/2 -translate-x-1/2 w-[150%] bg-white dark:bg-gray-800 rounded shadow-lg border dark:border-gray-700"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="flex gap-1 p-1">
          <button className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition-colors">
            Home X
          </button>
          <button className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors">
            Home Y
          </button>
        </div>
      </div>
    </>
  );
};

export default HomeTooltip;
