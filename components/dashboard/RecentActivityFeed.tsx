'use client'

import { Board, ColumnValue, Item } from '@/typings/types'
import { useMemo } from 'react'

interface ActivityItem {
  id: string
  action: string
  timestamp: number
}

export function RecentActivityFeed({ board }: { board: Board }) {
  const activities = useMemo(() => {
    const allActivities: ActivityItem[] = []

    board.items_page.items.forEach((item: Item) => {
      item.values.forEach((value: ColumnValue) => {
        if ('lastModifiedTimestamp' in value) {
          allActivities.push({
            id: item.id,
            action: `Updated ${value.columnName}`,
            timestamp: value.lastModifiedTimestamp,
          })
        }
      })
    })

    return allActivities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
  }, [board.items_page.items])

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={`${activity.id}-${activity.timestamp}`} className="flex items-center space-x-4">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <div className="flex-1">
            <p className="text-sm font-medium">{activity.action}</p>
            <p className="text-xs text-gray-500">
              {new Date(activity.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}