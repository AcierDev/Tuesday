'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Board, Item, ColumnValue, ColumnTitles } from '@/typings/types'
import { useTheme } from 'next-themes'

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface GluingActivityData {
  date: string
  squares: number
}

export function GluingActivityChart({ board, timeRange }: { board: Board; timeRange: TimeRange }) {
  const { theme } = useTheme()

  const data = useMemo(() => {
    const groupedData: { [key: string]: number } = {}

    board.items_page.items.forEach((item: Item) => {
      const gluedColumn = item.values.find((value: ColumnValue) => value.columnName === ColumnTitles.Glued)
      const sizeColumn = item.values.find((value: ColumnValue) => value.columnName === ColumnTitles.Size)
      
      if (gluedColumn && !item.deleted && 'credit' in gluedColumn && Array.isArray(gluedColumn.credit) &&
          sizeColumn && 'text' in sizeColumn) {
        const [width, height] = sizeColumn?.text?.split('x').map(dim => parseInt(dim.trim(), 10))
        const squares = width * height

        gluedColumn.credit.forEach((employee: string) => {
          const date = new Date(gluedColumn.lastModifiedTimestamp)
          let key: string

          switch (timeRange) {
            case 'daily':
              key = date.toISOString().split('T')[0]
              break
            case 'weekly':
              const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
              key = weekStart.toISOString().split('T')[0]
              break
            case 'monthly':
              key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
              break
            case 'yearly':
              key = date.getFullYear().toString()
              break
          }

          groupedData[key] = (groupedData[key] || 0) + squares
        })
      }
    })

    return Object.entries(groupedData)
      .map(([date, squares]) => ({ date, squares }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [board.items_page.items, timeRange])

  const chartColors = {
    light: {
      stroke: '#f0f0f0',
      text: '#888888',
      line: '#82ca9d',
    },
    dark: {
      stroke: '#374151',
      text: '#9CA3AF',
      line: '#34D399',
    },
  }

  const colors = theme === 'dark' ? chartColors.dark : chartColors.light

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.stroke} />
        <XAxis dataKey="date" stroke={colors.text} />
        <YAxis stroke={colors.text} />
        <Tooltip
          contentStyle={{
            background: theme === 'dark' ? '#1F2937' : '#fff',
            border: `1px solid ${colors.stroke}`,
            borderRadius: '4px',
            color: colors.text,
          }}
        />
        <Line type="monotone" dataKey="squares" stroke={colors.line} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}