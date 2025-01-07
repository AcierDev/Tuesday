import React from "react";
import PresetButtons from "./PresetButtons";
import GoToControls from "./GoToControls";
import StepperControls from "./stepper-controls";

const Movement = () => {
  return (
    <div className="p-6 rounded-lg bg-white shadow-md dark:bg-gray-700/20">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">Movement</h2>
      <div className="space-y-4">
        <PresetButtons />
        <GoToControls />
        <StepperControls />
      </div>
    </div>
  );
};

export default Movement;
