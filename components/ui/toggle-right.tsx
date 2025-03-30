import { ToggleRight as LucideToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToggleRightProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

export const ToggleRight = ({
  checked = false,
  onCheckedChange,
  className,
}: ToggleRightProps) => {
  return (
    <div
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "cursor-pointer transition-colors",
        checked ? "text-blue-500" : "text-gray-400",
        className
      )}
    >
      <LucideToggleRight className="h-6 w-6" />
    </div>
  );
};
