import React from "react";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, Zap, Video, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ComputerSelector from "./ComputerSelector";
import { SystemState } from "@/app/robotyler/page";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Computer } from "./ComputerSelector";

interface RoboTylerHeaderProps {
  status: SystemState;
  wsConnected: boolean;
  reconnectAttempts: number;
  MAX_RECONNECT_ATTEMPTS: number;
  handleReconnect: () => void;
  hasExceededReconnectAttempts: boolean;
  onSelectComputer: (ip: string) => void;
  showCameraFeed: boolean;
  onToggleCameraFeed: () => void;
  computers?: Computer[];
  sendCommand: (command: { type: string; payload?: any }) => void;
}

const RoboTylerHeader: React.FC<RoboTylerHeaderProps> = ({
  status,
  wsConnected,
  reconnectAttempts,
  MAX_RECONNECT_ATTEMPTS,
  handleReconnect,
  hasExceededReconnectAttempts,
  onSelectComputer,
  showCameraFeed,
  onToggleCameraFeed,
  computers = [
    { name: "Bentzi's Laptop", ip: "192.168.1.229:8080" },
    { name: "RoboTyler Raspi", ip: "192.168.1.197:8080" },
    { name: "Pi Zero 2", ip: "192.168.1.215:8080" },
    { name: "Dev Testing Raspi", ip: "192.168.1.216:8080" },
    { name: "localhost", ip: "localhost:8080" },
  ],
  sendCommand,
}) => {
  const getStatusColor = (): string => {
    if (!status?.status) {
      return "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400";
    }

    switch (status.status) {
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
          {/* Title */}
          <div className="flex flex-col">
            <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Paint System Control
            </h1>
          </div>

          {/* Network Controls and Status Indicators */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCameraFeed}
              className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                showCameraFeed
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              }`}
            >
              <Video className="w-5 h-5" />
              <span className="hidden lg:inline font-medium">
                {showCameraFeed ? "Hide Camera" : "Show Camera"}
              </span>
            </Button>

            <div
              className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor()}`}
            >
              {formatState(status?.status)}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => sendCommand({ type: "TOGGLE_PRESSURE_POT" })}
              disabled={
                !(status.status === "STOPPED" || status.status === "HOMED") ||
                !wsConnected
              }
              className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                status.pressurePotActive
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  : "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400"
              }`}
            >
              <Zap className="w-5 h-5" />
              <span className="hidden lg:inline font-medium">
                {status.pressurePotActive ? "Pressurized" : "Depressurized"}
              </span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                    wsConnected
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
                  }`}
                >
                  {wsConnected ? (
                    <>
                      <Wifi className="w-5 h-5" />
                      <span className="hidden lg:inline font-medium">
                        Connected
                      </span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-5 h-5" />
                      <span className="hidden lg:inline font-medium">
                        Disconnected
                      </span>
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border dark:border-gray-700 bg-white dark:bg-gray-800/90 backdrop-blur-sm"
              >
                {computers.map((computer) => (
                  <DropdownMenuItem
                    key={computer.ip}
                    onClick={() => onSelectComputer(computer.ip)}
                    className={`flex items-center justify-between py-2 px-3 cursor-pointer
                      hover:bg-gray-50 dark:hover:bg-gray-700/50
                      focus:bg-gray-50 dark:focus:bg-gray-700/50
                      ${
                        computer.ip === "192.168.1.222:8080"
                          ? "bg-green-50/50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                          : "text-gray-700 dark:text-gray-200"
                      }`}
                  >
                    <span className="font-medium">{computer.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {computer.ip}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
