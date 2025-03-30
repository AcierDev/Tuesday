import React from "react";
import PresetButtons from "./PresetButtons";
import GoToControls from "./GoToControls";
import StepperControls from "./stepper-controls";
import Joystick from "./Joystick";

const Movement = () => {
  return (
    <div className="p-6 rounded-lg bg-white shadow-md dark:bg-gray-700/20">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">Movement</h2>
      <div className="space-y-6">
        <PresetButtons />
        <GoToControls />
        <div className="flex gap-8 items-start">
          <div className="flex-1">
            <StepperControls />
          </div>
          <div className="flex items-center justify-center p-4">
            <Joystick size={150} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Movement;
