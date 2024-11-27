import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Wifi, WifiOff, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SystemStatus } from "@/app/tyler/page";

interface RoboTylerHeaderProps {
  status: SystemStatus;
  wsConnected: boolean;
  handleEmergencyStop: () => void;
  reconnectAttempts: number;
  MAX_RECONNECT_ATTEMPTS: number;
  handleReconnect: () => void;
  hasExceededReconnectAttempts: boolean;
}

const RoboTylerHeader: React.FC<RoboTylerHeaderProps> = ({
  status,
  wsConnected,
  handleEmergencyStop,
  reconnectAttempts,
  MAX_RECONNECT_ATTEMPTS,
  handleReconnect,
  hasExceededReconnectAttempts,
}) => {
  const getStatusColor = (): string => {
    switch (status.state) {
      case "ERROR":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
      case "EXECUTING_PATTERN":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
      case "PAUSED":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
      case "HOMING_X":
      case "HOMING_Y":
      case "HOMED":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      case "STOPPED":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
      case "PRIMING":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400";
      case "CLEANING":
        return "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400";
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 mb-6">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title only */}
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Paint System Control
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Monitor and control your automated painting system
            </p>
          </div>

          {/* Right side - Status, Connection Status and Emergency Stop */}
          <div className="flex items-center space-x-4">
            <div
              className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor()}`}
            >
              {status.state.replace(/_/g, " ")}
            </div>

            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-sm ${
                wsConnected
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
              }`}
            >
              {wsConnected ? (
                <>
                  <Wifi size={20} />
                  <span className="text-sm font-medium">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff size={20} />
                  <span className="text-sm font-medium">Disconnected</span>
                </>
              )}
            </div>

            <div
              className={`flex items-center px-4 py-2 rounded-full ${
                status.pressurePotActive
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  : "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400"
              }`}
            >
              <Zap size={16} className="mr-1" />
              <span className="text-sm font-medium">
                {status.pressurePotActive ? "Pressurized" : "Depressurized"}
              </span>
            </div>

            <Button
              size="lg"
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 h-12"
              onClick={handleEmergencyStop}
              disabled={!wsConnected}
            >
              <AlertTriangle className="mr-2" size={20} />
              Emergency Stop
            </Button>
          </div>
        </div>

        {/* Connection Alert */}
        {!wsConnected && (
          <Alert className="mt-4 border-2 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {hasExceededReconnectAttempts
                  ? "Connection failed after multiple attempts."
                  : `Attempting to connect... (${
                      reconnectAttempts + 1
                    }/${MAX_RECONNECT_ATTEMPTS})`}
              </span>
              {hasExceededReconnectAttempts && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReconnect}
                  className="ml-4 border-yellow-500 text-yellow-500 hover:bg-yellow-50"
                >
                  Try Again
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </header>
  );
};

export default RoboTylerHeader;
