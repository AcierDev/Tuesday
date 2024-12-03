import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface Computer {
  name: string;
  ip: string;
}

interface ComputerSelectorProps {
  computers: Computer[];
  onSelect: (ip: string) => void;
  initialIp?: string;
}

const ComputerSelector: React.FC<ComputerSelectorProps> = ({
  computers,
  onSelect,
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
    <div className="flex items-center space-x-4">
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
  );
};

export default ComputerSelector;
