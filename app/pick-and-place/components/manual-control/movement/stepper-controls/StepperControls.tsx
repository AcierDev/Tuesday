import React, { useState } from "react";
import StepSizeSelector, { type StepSize } from "./StepSizeSelector";
import AxisControls from "./AxisControls";
import { useWebSocket } from "../../../../contexts/WebSocketContext";

const StepperControls = () => {
  const { sendCommand } = useWebSocket();
  const [stepSize, setStepSize] = useState<StepSize>(1000);

  const handleXDecrement = () => {
    sendCommand(`moveX -${stepSize}`);
  };

  const handleXIncrement = () => {
    sendCommand(`moveX ${stepSize}`);
  };

  const handleYDecrement = () => {
    sendCommand(`moveY -${stepSize}`);
  };

  const handleYIncrement = () => {
    sendCommand(`moveY ${stepSize}`);
  };

  const handleHome = () => {
    sendCommand("home");
  };

  return (
    <div className="flex items-center gap-8">
      <StepSizeSelector value={stepSize} onChange={setStepSize} />
      <AxisControls
        onXDecrement={handleXDecrement}
        onXIncrement={handleXIncrement}
        onYDecrement={handleYDecrement}
        onYIncrement={handleYIncrement}
        onHome={handleHome}
      />
    </div>
  );
};

export default StepperControls;
