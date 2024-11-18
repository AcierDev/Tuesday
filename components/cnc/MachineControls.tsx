import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Home,
  Save,
} from "lucide-react";
import { Position } from "postcss";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

// Machine controls component
export const MachineControls = ({
  onMove,
  onHome,
  moveDistance,
  setMoveDistance,
  position,
  sendCommand,
}) => {
  const [savedPositions, setSavedPositions] = useState<Position[]>([]);

  const saveCurrentPosition = () => {
    setSavedPositions([...savedPositions, position]);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div></div>
        <Button variant="ghost" onClick={() => onMove(0, 1)} className="h-12">
          <ArrowUp className="w-6 h-6" />
        </Button>
        <div></div>
        <Button variant="ghost" onClick={() => onMove(-1, 0)} className="h-12">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <Button variant="secondary" onClick={() => onHome()} className="h-12">
          <Home className="w-6 h-6" />
        </Button>
        <Button variant="ghost" onClick={() => onMove(1, 0)} className="h-12">
          <ArrowRight className="w-6 h-6" />
        </Button>
        <div></div>
        <Button variant="ghost" onClick={() => onMove(0, -1)} className="h-12">
          <ArrowDown className="w-6 h-6" />
        </Button>
        <div></div>
      </div>

      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-2">
          <span className="font-medium">Step:</span>
          <Input
            type="number"
            value={moveDistance}
            onChange={(e) => setMoveDistance(parseFloat(e.target.value))}
            className="w-24"
          />
          <span>mm</span>
        </div>
        <Button
          variant="secondary"
          onClick={saveCurrentPosition}
          className="flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Position</span>
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Saved Positions</h3>
        <div className="grid grid-cols-2 gap-4">
          {savedPositions.map((pos, index) => (
            <Button
              key={index}
              variant="ghost"
              onClick={() => sendCommand("move", pos)}
              className="text-sm"
            >
              Position {index + 1}: ({pos.x.toFixed(1)}, {pos.y.toFixed(1)})
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
