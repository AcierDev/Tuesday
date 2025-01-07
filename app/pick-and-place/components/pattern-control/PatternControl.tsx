import React from "react";
import ControlButtons from "./control-buttons";
import Settings from "./settings";

const PatternControl = () => {
  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <div className="flex gap-6">
        <div className="flex-1">
          <Settings />
        </div>
        <div className="w-[300px]">
          <ControlButtons />
        </div>
      </div>
    </div>
  );
};

export default PatternControl;
