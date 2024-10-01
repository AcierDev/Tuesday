'use client'

import { useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Board, Item, ColumnValue, ColumnTitles } from '@/typings/types'

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface PerformerData {
  name: string
  squares: number
}

export default function TopPerformers({ 
  board, 
  timeRange, 
  selectedEmployee, 
  onEmployeeClick 
}: { 
  board: Board; 
  timeRange: TimeRange; 
  selectedEmployee: string | null;
  onEmployeeClick: (employee: string) => void;
}) {
  const data = useMemo(() => {
    const performerData: { [key: string]: number } = {}

    board.items_page.items.forEach((item: Item) => {
      const gluedColumn = item.values.find((value: ColumnValue) => value.columnName === ColumnTitles.Glued)
      const sizeColumn = item.values.find((value: ColumnValue) => value.columnName === ColumnTitles.Size)
      
      if (gluedColumn && !item.deleted && 'credit' in gluedColumn && Array.isArray(gluedColumn.credit) &&
          sizeColumn && 'text' in sizeColumn) {
        const [width, height] = sizeColumn.text.split('x').map(dim => parseInt(dim.trim(), 10))
        const totalSquares = width * height

        const date = new Date(gluedColumn.lastModifiedTimestamp)
        const isInRange = (date: Date) => {
          const now = new Date()
          switch (timeRange) {
            case 'daily':
              return date.toDateString() === now.toDateString()
            case 'weekly':
              const weekAgo = new Date(now.setDate(now.getDate() - 7))
              return date >= weekAgo
            case 'monthly':
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
            case 'yearly':
              return date.getFullYear() === now.getFullYear()
          }
        }

        if (isInRange(date)) {
          const creditCount = gluedColumn.credit.length
          const squaresPerPerson = totalSquares / creditCount
          gluedColumn.credit.forEach((employee: string) => {
            performerData[employee] = (performerData[employee] || 0) + squaresPerPerson
          })
        }
      }
    })

    return Object.entries(performerData)
      .map(([name, squares]) => ({ name, squares: Math.round(squares) }))
      .sort((a, b) => b.squares - a.squares)
      .slice(0, 5)
  }, [board.items_page.items, timeRange])

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <Table className="flex-grow">
        <TableHeader>
          <TableRow>
            <TableHead className="text-gray-700 dark:text-gray-300">Employee</TableHead>
            <TableHead className="text-right text-gray-700 dark:text-gray-300">Squares Glued</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((performer) => (
            <TableRow 
              key={performer.name} 
              className={selectedEmployee === performer.name ? 'bg-blue-100 dark:bg-blue-900' : ''}
            >
              <TableCell 
                className="text-gray-800 dark:text-gray-200 cursor-pointer hover:underline"
                onClick={() => onEmployeeClick(performer.name)}
              >
                {performer.name}
              </TableCell>
              <TableCell className="text-right text-gray-800 dark:text-gray-200">{performer.squares}</TableCell>
            </TableRow>
          ))}
          {data.length < 5 && [...Array(5 - data.length)].map((_, index) => (
            <TableRow key={`empty-${index}`}>
              <TableCell className="text-gray-400 dark:text-gray-600">&mdash;</TableCell>
              <TableCell className="text-right text-gray-400 dark:text-gray-600">&mdash;</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}