import React from "react";
import { TabView, type TabOption } from "./TabView";
import PatternControl from "./pattern-control";
import ManualControl from "./manual-control";
import { useWebSocket } from "../contexts/WebSocketContext";

type ControlMode = "pattern" | "manual";

const controlOptions: TabOption<ControlMode>[] = [
  {
    id: "pattern",
    label: "Pattern Control",
    content: <PatternControl />,
  },
  {
    id: "manual",
    label: "Manual Control",
    content: <ManualControl />,
  },
];

const PickAndPlaceContent = () => {
  const { connected } = useWebSocket();

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Pick & Place
        </h1>
        <div
          className={`h-3 w-3 rounded-full ${
            connected ? "bg-green-500" : "bg-red-500"
          }`}
          title={connected ? "Connected" : "Disconnected"}
        />
      </div>
      <TabView options={controlOptions} defaultTab="pattern" />
    </div>
  );
};

export default PickAndPlaceContent;
