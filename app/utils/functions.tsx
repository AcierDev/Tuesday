import { ColumnValue, Item, ColumnTypes, ProgressStatus, ColumnTitles } from '../typings/types'
import { Badge } from "@/components/ui/badge"
import { format, addDays, isWithinInterval, isBefore, isToday } from 'date-fns'

export const getCellClassName = (columnValue: ColumnValue): string => {
  if (columnValue.type === ColumnTypes.Dropdown) {
    switch (columnValue.text) {
      case ProgressStatus.Done:
        return "bg-green-100";
      case ProgressStatus.Working_On_It:
        return "bg-yellow-100";
      case ProgressStatus.Didnt_Start:
        return "bg-white";
      case ProgressStatus.Stuck:
        return "bg-red-100";
      default:
        return "bg-white";
    }
  }
  return "bg-white";
}

export const getDueBadge = (dateString: string, range: number) => {
  const dueDate = new Date(dateString)
  const now = new Date()
  const daysFromNow = addDays(now, range)

  if (isBefore(dueDate, now)) {
    return <Badge variant="destructive">Due</Badge>
  } else if (isToday(dueDate)) {
    return <Badge variant="destructive">Due</Badge>
  } else if (isWithinInterval(dueDate, { start: now, end: daysFromNow })) {
    return <Badge variant="destructive">Due</Badge>
  }
  return null
}

export const isPastDue = (item: Item) => {
  const dueDateValue = item.values.find(value => value.columnName === ColumnTitles.Due)
  if (dueDateValue && dueDateValue.text) {
    const dueDate = new Date(dueDateValue.text)
    return isBefore(dueDate, new Date())
  }
  return false
}