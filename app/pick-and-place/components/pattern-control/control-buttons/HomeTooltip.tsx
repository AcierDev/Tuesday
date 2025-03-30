import React from "react";
import { useWebSocket } from "../../../contexts/WebSocketContext";

interface HomeTooltipProps {
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isHoming: boolean;
}

const HomeTooltip = ({
  onMouseEnter,
  onMouseLeave,
  isHoming,
}: HomeTooltipProps) => {
  const { sendCommand } = useWebSocket();

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
          <button
            onClick={() => sendCommand("homeX")}
            disabled={isHoming}
            className={`flex-1 px-4 py-2 text-white rounded transition-colors ${
              isHoming
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-cyan-500 hover:bg-cyan-600"
            }`}
          >
            Home X
          </button>
          <button
            onClick={() => sendCommand("homeY")}
            disabled={isHoming}
            className={`flex-1 px-4 py-2 text-white rounded transition-colors ${
              isHoming
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-500 hover:bg-indigo-600"
            }`}
          >
            Home Y
          </button>
        </div>
      </div>
    </>
  );
};

export default HomeTooltip;
