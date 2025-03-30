import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem as ShadcnSelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Server,
  Laptop,
  Computer,
  Globe,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as React from "react";

// Custom SelectItem without the checkmark
const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export interface Computer {
  name: string;
  ip: string;
}

interface ComputerSelectorProps {
  computers: Computer[];
  onSelect: (ip: string) => void;
  onReconnect?: () => void;
  isConnecting?: boolean;
  initialIp?: string;
  connectionStatus?: "connected" | "disconnected";
}

const getComputerIcon = (name: string) => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes("raspi") || nameLower.includes("pi")) {
    return <Server className="h-4 w-4 mr-2 text-purple-500" />;
  } else if (nameLower.includes("laptop")) {
    return <Laptop className="h-4 w-4 mr-2 text-blue-500" />;
  } else if (nameLower.includes("local")) {
    return <Globe className="h-4 w-4 mr-2 text-green-500" />;
  }
  return <Computer className="h-4 w-4 mr-2 text-gray-500" />;
};

const ComputerSelector: React.FC<ComputerSelectorProps> = ({
  computers,
  onSelect,
  onReconnect,
  isConnecting = false,
  initialIp,
  connectionStatus = "disconnected",
}) => {
  const [selectedComputer, setSelectedComputer] = useState(
    initialIp || computers[0]?.ip
  );
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (selectedComputer) {
      onSelect(selectedComputer);
    }
  }, [selectedComputer, onSelect]);

  const selectedName =
    computers.find((c) => c.ip === selectedComputer)?.name || "Select";

  const isConnected = connectionStatus === "connected";

  // Define mobile and desktop styles
  const getMobileStyles = () => {
    return {
      triggerClass: cn(
        "w-auto h-9 rounded-full border transition-all shadow-sm",
        "flex items-center justify-between gap-1 px-2.5 py-1",
        isConnected
          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
        "hover:shadow-md focus:ring-2",
        isConnected
          ? "hover:bg-green-50 dark:hover:bg-green-900/40 focus:ring-green-500/30 dark:focus:ring-green-500/40"
          : "hover:bg-red-50 dark:hover:bg-red-900/40 focus:ring-red-500/30 dark:focus:ring-red-500/40"
      ),
      contentClass:
        "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg rounded-lg p-1 overflow-hidden w-[280px]",
      labelSize: "text-xs",
    };
  };

  const getDesktopStyles = () => {
    return {
      triggerClass: cn(
        "w-[280px] h-10 rounded-full border transition-all shadow-sm",
        "flex items-center justify-between gap-2 px-4 py-2",
        isConnected
          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
        "hover:shadow-md focus:ring-2",
        isConnected
          ? "hover:bg-green-50 dark:hover:bg-green-900/40 focus:ring-green-500/30 dark:focus:ring-green-500/40"
          : "hover:bg-red-50 dark:hover:bg-red-900/40 focus:ring-red-500/30 dark:focus:ring-red-500/40"
      ),
      contentClass:
        "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg rounded-lg p-1 overflow-hidden w-[280px]",
      labelSize: "text-xs",
    };
  };

  const styles = isMobile ? getMobileStyles() : getDesktopStyles();

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Select
          onValueChange={setSelectedComputer}
          defaultValue={selectedComputer}
        >
          <SelectTrigger id="computer-select" className={styles.triggerClass}>
            <div className="flex items-center gap-1 overflow-hidden flex-1">
              {isConnected ? (
                <Wifi
                  className={`h-4 w-4 flex-shrink-0 ${isMobile ? "mr-0" : ""}`}
                />
              ) : (
                <WifiOff
                  className={`h-4 w-4 flex-shrink-0 ${isMobile ? "mr-0" : ""}`}
                />
              )}
              {!isMobile && (
                <span className="font-medium text-sm whitespace-nowrap">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "px-2 py-0.5 text-xs ml-1 font-medium",
                  "flex items-center gap-1 whitespace-nowrap",
                  isMobile ? "max-w-[80px]" : "max-w-[120px]",
                  "overflow-hidden",
                  isConnected
                    ? "bg-green-50/50 dark:bg-green-900/20 border-green-200 dark:border-green-800/70"
                    : "bg-red-50/50 dark:bg-red-900/20 border-red-200 dark:border-red-800/70"
                )}
              >
                {!isMobile && getComputerIcon(selectedName)}
                <span className="truncate">
                  {isMobile ? selectedName.split(" ")[0] : selectedName}
                </span>
              </Badge>
            </div>
          </SelectTrigger>
          <SelectContent
            align="start"
            className={styles.contentClass}
            position={isMobile ? "popper" : "item-aligned"}
            side={isMobile ? "bottom" : "bottom"}
            sideOffset={isMobile ? 8 : 4}
            alignOffset={isMobile ? -10 : 0}
          >
            <SelectGroup>
              <SelectLabel
                className={`px-2 py-1.5 ${styles.labelSize} text-gray-500 dark:text-gray-400 font-medium`}
              >
                Available Devices
              </SelectLabel>
              {computers.map((computer) => (
                <SelectItem
                  key={computer.ip}
                  value={computer.ip}
                  className="rounded-md flex items-center text-sm my-1 px-2 py-1.5 data-[highlighted]:bg-blue-50 dark:data-[highlighted]:bg-blue-900/20 data-[highlighted]:text-blue-600 dark:data-[highlighted]:text-blue-400 cursor-pointer transition-colors data-[state=checked]:bg-blue-50 dark:data-[state=checked]:bg-blue-900/20 data-[state=checked]:text-blue-600 dark:data-[state=checked]:text-blue-400"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      {getComputerIcon(computer.name)}
                      {isMobile && computer.name.length > 10
                        ? `${computer.name.substring(0, 10)}...`
                        : computer.name}
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 font-mono ml-2 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                    >
                      {computer.ip.split(":")[0]}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
            {onReconnect && (
              <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReconnect}
                  disabled={isConnecting}
                  className={`w-full justify-start text-sm h-9 font-medium rounded-md ${
                    isConnecting
                      ? "opacity-70"
                      : "hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                  }`}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isConnecting ? "animate-spin" : ""
                    }`}
                  />
                  {isConnecting ? "Connecting..." : "Reconnect"}
                </Button>
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile quick reconnect button */}
      {isMobile && onReconnect && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onReconnect}
          disabled={isConnecting}
          className={`h-9 w-9 rounded-full ${
            isConnecting
              ? "opacity-70"
              : isConnected
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
          }`}
        >
          <RefreshCw
            className={`h-4 w-4 ${isConnecting ? "animate-spin" : ""}`}
          />
        </Button>
      )}
    </div>
  );
};

export default ComputerSelector;
