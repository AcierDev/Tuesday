import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/utils/functions";

interface SplitButtonProps extends Omit<ButtonProps, "onClick"> {
  onMainClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onSplitClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  mainContent: React.ReactNode;
  splitContent: React.ReactNode;
  splitButtonClassName?: string;
}

export const SplitButton = React.forwardRef<HTMLDivElement, SplitButtonProps>(
  (
    {
      className,
      splitButtonClassName,
      variant = "default",
      size = "default",
      onMainClick,
      onSplitClick,
      mainContent,
      splitContent,
      ...props
    },
    ref
  ) => {
    return (
      <div
        className={cn(
          "inline-flex -space-x-px rounded-md shadow-sm dark:bg-gray-600",
          className
        )}
        ref={ref}
      >
        <Button
          variant={variant}
          size={size}
          className={cn(
            "rounded-r-none focus:z-10 flex-1 dark:bg-gray-600",
            variant === "outline" && "border-r-0"
          )}
          onClick={onMainClick}
          {...props}
        >
          {mainContent}
        </Button>
        <Button
          variant={variant}
          size={size}
          className={cn(
            "rounded-l-none px-2 focus:z-10",
            variant === "default" && "border-l border-l-primary-foreground/20",
            variant === "outline" && "border-l border-input",
            splitButtonClassName
          )}
          onClick={onSplitClick}
          {...props}
        >
          {splitContent}
        </Button>
      </div>
    );
  }
);
SplitButton.displayName = "SplitButton";
