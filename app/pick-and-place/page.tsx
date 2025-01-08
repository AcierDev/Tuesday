"use client";

import React from "react";
import PatternControl from "./components/pattern-control";
import ManualControl from "./components/manual-control";
import { TabView, type TabOption } from "./components/TabView";

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

const PickAndPlace = () => {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
        Pick & Place
      </h1>
      <TabView options={controlOptions} defaultTab="pattern" />
    </div>
  );
};

export default PickAndPlace;
