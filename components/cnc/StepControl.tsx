import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const StepControl = ({ sendCommand }) => {
  const [xSteps, setXSteps] = useState(0);
  const [ySteps, setYSteps] = useState(0);
  const [error, setError] = useState("");

  const validateSteps = (value: number) => {
    if (isNaN(value)) {
      setError("Steps must be a valid number");
      return false;
    }
    if (!Number.isInteger(value)) {
      setError("Steps must be a whole number");
      return false;
    }
    setError("");
    return true;
  };

  const handleStepMove = (axis: "X" | "Y", steps: number) => {
    if (!validateSteps(steps)) return;

    // Match the exact format expected by the ESP32Controller
    sendCommand("step_move", {
      axis: axis,
      steps: Math.abs(steps),
      direction: steps >= 0 ? "POS" : "NEG",
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: number) => void
  ) => {
    const value = e.target.value === "" ? 0 : parseInt(e.target.value);
    setter(value);
    validateSteps(value);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Step Control</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="x-steps" className="text-sm font-medium">
              X-Axis Steps
            </label>
            <div className="flex items-center space-x-2">
              <Input
                id="x-steps"
                type="number"
                value={xSteps}
                onChange={(e) => handleInputChange(e, setXSteps)}
                className="w-40"
              />
              <Button
                variant="secondary"
                onClick={() => handleStepMove("X", xSteps)}
                className="w-24"
              >
                Move X
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="y-steps" className="text-sm font-medium">
              Y-Axis Steps
            </label>
            <div className="flex items-center space-x-2">
              <Input
                id="y-steps"
                type="number"
                value={ySteps}
                onChange={(e) => handleInputChange(e, setYSteps)}
                className="w-40"
              />
              <Button
                variant="secondary"
                onClick={() => handleStepMove("Y", ySteps)}
                className="w-24"
              >
                Move Y
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setXSteps(0);
              setYSteps(0);
              setError("");
            }}
            className="w-full"
          >
            Reset Values
          </Button>
          <Button
            variant="default"
            onClick={() => {
              if (validateSteps(xSteps) && validateSteps(ySteps)) {
                handleStepMove("X", xSteps);
                handleStepMove("Y", ySteps);
              }
            }}
            className="w-full"
          >
            Move Both
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
