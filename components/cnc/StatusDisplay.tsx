import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";

// Status display component
export const StatusDisplay = ({ status }) => (
  <div className="space-y-4">
    <div
      className={`text-lg font-bold flex items-center justify-center space-x-2 
      ${
        status.state === "ERROR"
          ? "text-red-500"
          : status.state === "MOVING"
          ? "text-yellow-500"
          : "text-green-500"
      }`}
    >
      <span>{status.state}</span>
      {status.state === "ERROR" && <AlertCircle className="w-5 h-5" />}
    </div>
    {status.error && (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{status.error}</AlertDescription>
      </Alert>
    )}
    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div>X: {status.position.x.toFixed(2)} mm</div>
      <div>Y: {status.position.y.toFixed(2)} mm</div>
    </div>
  </div>
);
