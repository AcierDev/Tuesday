import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Wifi, WifiOff, Zap, Video } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ComputerSelector from "./ComputerSelector";
import { SystemState } from "@/app/robotyler/page";

interface RoboTylerHeaderProps {
  status: SystemState;
  wsConnected: boolean;
  handleEmergencyStop: () => void;
  reconnectAttempts: number;
  MAX_RECONNECT_ATTEMPTS: number;
  handleReconnect: () => void;
  hasExceededReconnectAttempts: boolean;
  onSelectComputer: (ip: string) => void;
  showCameraFeed: boolean;
  onToggleCameraFeed: () => void;
}

const RoboTylerHeader: React.FC<RoboTylerHeaderProps> = ({
  status,
  wsConnected,
  handleEmergencyStop,
  reconnectAttempts,
  MAX_RECONNECT_ATTEMPTS,
  handleReconnect,
  hasExceededReconnectAttempts,
  onSelectComputer,
  showCameraFeed,
  onToggleCameraFeed,
}) => {
  const getStatusColor = (): string => {
    if (!status?.state) {
      return "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400";
    }

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

  const formatState = (state: string | undefined): string => {
    if (!state) return "Unknown";
    return state.replace(/_/g, " ");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 mb-4 lg:mb-6 lg:z-50">
      <div className="container mx-auto px-4 py-3 lg:py-4 mt-14 lg:mt-0">
        <div className="w-full flex flex-wrap items-start lg:items-center justify-between gap-2 lg:gap-4">
          {/* Title and controls */}
          <div className="flex flex-col">
            <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Paint System Control
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="hidden lg:block text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                Monitor and control your automated painting system
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCameraFeed}
                className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors duration-200 ${
                  showCameraFeed
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                <Video size={14} />
                {showCameraFeed ? "Hide Camera" : "Show Camera"}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <div
              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
            >
              {formatState(status?.state)}
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full shadow-sm ${
                wsConnected
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
              }`}
            >
              {wsConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            </div>
            <div
              className={`flex items-center px-2 py-1 rounded-full ${
                status.pressurePotActive
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  : "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400"
              }`}
            >
              <Zap size={14} />
            </div>
            <Button
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-2 py-1 h-7 text-xs"
              onClick={handleEmergencyStop}
              disabled={!wsConnected}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="sr-only">Emergency Stop</span>
            </Button>
          </div>

          {/* Larger screen controls */}
          <div className="hidden lg:flex flex-wrap items-center gap-4">
            <ComputerSelector
              onSelect={onSelectComputer}
              computers={[
                { name: "Bentzi's Laptop", ip: "192.168.1.222:8080" },
                { name: "RoboTyler Raspi", ip: "192.168.1.197:8080" },
                { name: "Pi Zero 2", ip: "192.168.1.215:8080" },
                { name: "Dev Testing Raspi", ip: "192.168.1.216:8080" },
                { name: "localhost", ip: "localhost:8080" },
              ]}
            />
            <div
              className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor()}`}
            >
              {formatState(status?.state)}
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
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 h-12 text-sm"
              onClick={handleEmergencyStop}
              disabled={!wsConnected}
            >
              <AlertTriangle className="mr-2 w-5 h-5" />
              Emergency Stop
            </Button>
          </div>
        </div>

        {/* Connection Alert */}
        {!wsConnected && (
          <Alert className="mt-3 lg:mt-4 border-2 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs lg:text-sm">
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
                  className="mt-2 sm:mt-0 border-yellow-500 text-yellow-500 hover:bg-yellow-50 text-xs lg:text-sm px-2 py-1 h-7 lg:h-8"
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
