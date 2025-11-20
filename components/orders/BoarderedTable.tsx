import React from "react";
import { Table } from "@/components/ui/table";
import { cn } from "@/utils/functions";

interface BorderedTableProps extends React.HTMLAttributes<HTMLTableElement> {
  borderColor?: string;
  children?: React.ReactNode;
}

export const BorderedTable = React.forwardRef<
  HTMLTableElement,
  BorderedTableProps
>(({ children, borderColor = "bg-primary", className, ...props }, ref) => {
  const textClass = borderColor.replace("bg-", "text-");

  return (
    <div className="relative rounded-2xl border border-border dark:border-border">
      {/* Top Cap */}
      <svg
        className={cn(
          "absolute left-0 top-0 w-6 h-4 z-20 fill-current",
          textClass
        )}
        viewBox="0 0 24 16"
        preserveAspectRatio="none"
      >
        <path d="M 0 16 A 16 16 0 0 1 16 0 L 24 0 Q 8 0 8 16 Z" />
      </svg>

      {/* Bottom Cap */}
      <svg
        className={cn(
          "absolute left-0 bottom-0 w-6 h-4 z-20 fill-current",
          textClass
        )}
        viewBox="0 0 24 16"
        preserveAspectRatio="none"
      >
        <path d="M 0 0 A 16 16 0 0 0 16 16 L 24 16 Q 8 16 8 0 Z" />
      </svg>

      {/* Vertical Bar */}
      <div
        className={cn("absolute left-0 top-4 bottom-4 w-2 z-20", borderColor)}
      />

      <div className="relative" style={{ clipPath: "inset(0 round 1rem)" }}>
        <Table ref={ref} className={cn("relative z-10", className)} {...props}>
          {children}
        </Table>
      </div>
    </div>
  );
});

BorderedTable.displayName = "BorderedTable";
