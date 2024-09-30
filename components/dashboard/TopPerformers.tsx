'use client'

import { useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Board, Item, ColumnValue, ColumnTitles } from '@/typings/types'

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface PerformerData {
  name: string
  squares: number
}

export function TopPerformers({ board, timeRange }: { board: Board; timeRange: TimeRange }) {
  const data = useMemo(() => {
    const performerData: { [key: string]: number } = {}

    board.items_page.items.forEach((item: Item) => {
      const gluedColumn = item.values.find((value: ColumnValue) => value.columnName === ColumnTitles.Glued)
      const sizeColumn = item.values.find((value: ColumnValue) => value.columnName === ColumnTitles.Size)
      
      if (gluedColumn && !item.deleted && 'credit' in gluedColumn && Array.isArray(gluedColumn.credit) &&
          sizeColumn && 'text' in sizeColumn) {
        const [width, height] = sizeColumn?.text?.split('x').map(dim => parseInt(dim.trim(), 10))
        const squares = width * height

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
          gluedColumn.credit.forEach((employee: string) => {
            performerData[employee] = (performerData[employee] || 0) + squares
          })
        }
      }
    })

    return Object.entries(performerData)
      .map(([name, squares]) => ({ name, squares }))
      .sort((a, b) => b.squares - a.squares)
      .slice(0, 5)
  }, [board.items_page.items, timeRange])

  return (
    <div className="flex flex-col h-full">
      <Table className="flex-grow">
        <TableHeader>
          <TableRow>
            <TableHead className="dark:text-gray-300">Employee</TableHead>
            <TableHead className="text-right dark:text-gray-300">Squares Glued</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((performer) => (
            <TableRow key={performer.name}>
              <TableCell className="dark:text-gray-300">{performer.name}</TableCell>
              <TableCell className="text-right dark:text-gray-300">{performer.squares}</TableCell>
            </TableRow>
          ))}
          {data.length < 5 && [...Array(5 - data.length)].map((_, index) => (
            <TableRow key={`empty-${index}`}>
              <TableCell className="dark:text-gray-300">&nbsp;</TableCell>
              <TableCell className="text-right dark:text-gray-300">&nbsp;</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}