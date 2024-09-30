'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Board, Item, ColumnValue, ColumnTitles, ItemStatus } from '@/typings/types'
import { useTheme } from 'next-themes'

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface OrderCompletionData {
  date: string
  completions: number
}

export function OrderCompletionChart({ board, timeRange }: { board: Board; timeRange: TimeRange }) {
  const { theme } = useTheme()

  const data = useMemo(() => {
    const completedItems = board.items_page.items.filter(item => item.status === ItemStatus.Done && !item.deleted)
    const groupedData: { [key: string]: number } = {}

    completedItems.forEach((item: Item) => {
      const dueColumn = item.values.find((value: ColumnValue) => value.columnName === ColumnTitles.Due)
      if (dueColumn && 'text' in dueColumn) {
        const date = new Date(dueColumn.text)
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

        groupedData[key] = (groupedData[key] || 0) + 1
      }
    })

    return Object.entries(groupedData)
      .map(([date, completions]) => ({ date, completions }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [board.items_page.items, timeRange])

  const chartColors = {
    light: {
      stroke: '#f0f0f0',
      text: '#888888',
      line: '#8884d8',
    },
    dark: {
      stroke: '#374151',
      text: '#9CA3AF',
      line: '#A78BFA',
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
        <Line type="monotone" dataKey="completions" stroke={colors.line} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}