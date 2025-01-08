import React, { useState } from "react";
import StepSizeSelector, { type StepSize } from "./StepSizeSelector";
import AxisControls from "./AxisControls";

const StepperControls = () => {
  const [stepSize, setStepSize] = useState<StepSize>(50);

  const handleXDecrement = () => {
    // TODO: Implement X decrement
  };

  const handleXIncrement = () => {
    // TODO: Implement X increment
  };

  const handleYDecrement = () => {
    // TODO: Implement Y decrement
  };

  const handleYIncrement = () => {
    // TODO: Implement Y increment
  };

  return (
    <div className="space-y-4">
      <StepSizeSelector value={stepSize} onChange={setStepSize} />
      <AxisControls
        axis="X"
        onDecrement={handleXDecrement}
        onIncrement={handleXIncrement}
      />
      <AxisControls
        axis="Y"
        onDecrement={handleYDecrement}
        onIncrement={handleYIncrement}
      />
    </div>
  );
};

export default StepperControls;
