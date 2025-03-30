import React from "react";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SystemState } from "@/app/pick-n-place/page";

interface PickNPlaceHeaderProps {
  status: SystemState;
  wsConnected: boolean;
  reconnectAttempts: number;
  MAX_RECONNECT_ATTEMPTS: number;
  handleReconnect: () => void;
  onSelectComputer: (ip: string) => void;
}

const PickNPlaceHeader: React.FC<PickNPlaceHeaderProps> = ({
  status,
  wsConnected,
  reconnectAttempts,
  MAX_RECONNECT_ATTEMPTS,
  handleReconnect,
  onSelectComputer,
}) => {
  const hasExceededReconnectAttempts =
    reconnectAttempts >= MAX_RECONNECT_ATTEMPTS;

  const getStatusColor = (): string => {
    if (!status?.status) {
      return "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400";
    }

    switch (status.status) {
      case "ERROR":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
      case "RUNNING":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
      case "PAUSED":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
      case "HOMING":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      case "STOPPED":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400";
    }
  };

  const computers = [
    { name: "Bentzi's Laptop", ip: "192.168.1.229:8080" },
    { name: "localhost", ip: "localhost:8080" },
    { name: "Pick & Place Machine", ip: "192.168.1.198:8080" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 mb-4 lg:mb-6">
      <div className="container mx-auto px-4 py-3 lg:py-4">
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col">
            <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Pick & Place Control
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor()}`}
            >
              {status?.status || "UNKNOWN"}
            </div>

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
                    className="flex items-center justify-between py-2 px-3 cursor-pointer
                      hover:bg-gray-50 dark:hover:bg-gray-700/50"
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

export default PickNPlaceHeader;
