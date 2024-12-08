import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

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
}

const ComputerSelector: React.FC<ComputerSelectorProps> = ({
  computers,
  onSelect,
  onReconnect,
  isConnecting = false,
  initialIp,
}) => {
  const [selectedComputer, setSelectedComputer] = useState(
    initialIp || computers[0]?.ip
  );

  useEffect(() => {
    if (selectedComputer) {
      onSelect(selectedComputer);
    }
  }, [selectedComputer, onSelect]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-4">
        <Label
          htmlFor="computer-select"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Select Computer:
        </Label>
        <Select
          onValueChange={setSelectedComputer}
          defaultValue={selectedComputer}
        >
          <SelectTrigger
            id="computer-select"
            className="w-[200px] dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
          >
            <SelectValue placeholder="Select a computer" />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            {computers.map((computer) => (
              <SelectItem
                key={computer.ip}
                value={computer.ip}
                className="dark:text-gray-200 dark:focus:bg-gray-700"
              >
                {computer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {onReconnect && (
        <Button
          variant="outline"
          size="icon"
          onClick={onReconnect}
          disabled={isConnecting}
          className={`h-9 w-9 rounded-full border dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 transition-all duration-200 ${
            isConnecting
              ? "animate-spin"
              : "hover:animate-spin hover:bg-gray-100 dark:hover:border-gray-600"
          }`}
          title="Reconnect"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              isConnecting
                ? "text-gray-400 dark:text-gray-500"
                : "text-gray-600 dark:text-gray-400"
            }`}
          />
        </Button>
      )}
    </div>
  );
};

export default ComputerSelector;
