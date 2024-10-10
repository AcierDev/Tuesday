import React from 'react'
import { Table, TableProps } from "@/components/ui/table"
import { cn } from '@/utils/functions'

interface BorderedTableProps extends TableProps {
  borderColor?: string
}

export const BorderedTable = React.forwardRef<HTMLTableElement, BorderedTableProps>(
  ({ children, borderColor = "bg-primary", className, ...props }, ref) => {
    return (
      <div className="relative overflow-hidden rounded-lg border border-border dark:border-border">
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-2 z-20",
          borderColor
        )} />
        <div className="overflow-x-auto relative">
          <Table ref={ref} className={cn("relative z-10", className)} {...props}>
            {children}
          </Table>
        </div>
      </div>
    )
  }
)

BorderedTable.displayName = 'BorderedTable'