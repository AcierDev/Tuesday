import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square } from "lucide-react";

interface OperationControlsProps {
  wsConnected: boolean;
  sendCommand: (command: { type: string; data?: any }) => void;
  gridRows: number;
  gridColumns: number;
  startX: number;
  startY: number;
  gridLength: number;
  gridWidth: number;
  pickupX: number;
  pickupY: number;
}

export const OperationControls: React.FC<OperationControlsProps> = ({
  wsConnected,
  sendCommand,
  gridRows,
  gridColumns,
  startX,
  startY,
  gridLength,
  gridWidth,
  pickupX,
  pickupY,
}) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Button
        className="relative p-3 rounded-lg bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-transparent
          hover:bg-gray-50 dark:hover:bg-gray-750
          hover:border-green-500 dark:hover:border-green-400
          hover:shadow-md hover:scale-[1.02]
          transform transition-all duration-200 ease-in-out
          disabled:opacity-50 disabled:hover:scale-100 
          disabled:hover:shadow-none disabled:hover:border-gray-200
          h-full flex flex-col items-center justify-center"
        onClick={() =>
          sendCommand({
            type: "command",
            data: {
              type: "start",
              params: {
                rows: gridRows,
                cols: gridColumns,
                startX,
                startY,
                gridLength,
                gridWidth,
                pickupX,
                pickupY,
              },
            },
          })
        }
        disabled={!wsConnected}
      >
        <Play className="w-5 h-5 text-green-500 dark:text-green-400 mb-2" />
        <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
          Start
        </span>
      </Button>

      <Button
        className="relative p-3 rounded-lg bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-transparent
          hover:bg-gray-50 dark:hover:bg-gray-750
          hover:border-yellow-500 dark:hover:border-yellow-400
          hover:shadow-md hover:scale-[1.02]
          transform transition-all duration-200 ease-in-out
          disabled:opacity-50 disabled:hover:scale-100 
          disabled:hover:shadow-none disabled:hover:border-gray-200
          h-full flex flex-col items-center justify-center"
        onClick={() =>
          sendCommand({
            type: "command",
            data: {
              type: "pause",
            },
          })
        }
        disabled={!wsConnected}
      >
        <Pause className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mb-2" />
        <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
          Pause
        </span>
      </Button>

      <Button
        className="relative p-3 rounded-lg bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-transparent
          hover:bg-gray-50 dark:hover:bg-gray-750
          hover:border-red-500 dark:hover:border-red-400
          hover:shadow-md hover:scale-[1.02]
          transform transition-all duration-200 ease-in-out
          disabled:opacity-50 disabled:hover:scale-100 
          disabled:hover:shadow-none disabled:hover:border-gray-200
          h-full flex flex-col items-center justify-center"
        onClick={() =>
          sendCommand({
            type: "command",
            data: {
              type: "stop",
            },
          })
        }
        disabled={!wsConnected}
      >
        <Square className="w-5 h-5 text-red-500 dark:text-red-400 mb-2" />
        <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
          Stop
        </span>
      </Button>
    </div>
  );
};
