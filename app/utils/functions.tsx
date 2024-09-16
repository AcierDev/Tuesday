import { ColumnValue, Item, ColumnTypes, ProgressStatus, ColumnTitles, ItemSizes } from '../typings/types'
import { Badge } from "@/components/ui/badge"
import { format, addDays, isWithinInterval, isBefore, isToday } from 'date-fns'
import { boardConfig } from '../config/boardconfig';

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

export function getBoxData(size: ItemSizes) {
  const [width, length] = size.split(" x ").map(Number);

  const dimensionConfigs: { [key: string]: any } = {
    "18 x 36": [{ length: 44, width: 22, height: 4, weight: 12 }],
    "18 x 48": [{ length: 54, width: 22, height: 4, weight: 15 }],
    "30 x 48": [{ length: 39, width: 35, height: 7, weight: 40 }],
    "30 x 60": [{ length: 39, width: 35, height: 7, weight: 50 }],
    "30 x 72": [{ length: 39, width: 35, height: 7, weight: 60 }],
    "36 x 60": [{ length: 39, width: 35, height: 7, weight: 50 }],
    "36 x 72": [{ length: 41.5, width: 37, height: 6, weight: 65 }],
    "36 x 84": [
      { length: 39, width: 35, height: 7, weight: 50 },
      { length: 41, width: 32, height: 4, weight: 25 }
    ],
    "48 x 84": [
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 32, height: 5, weight: 35 }
    ],
    "48 x 108": [
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 32, height: 5, weight: 35 }
    ]
  };

  const key = `${width} x ${length}`;
  const configurations = dimensionConfigs[key];

  if (!configurations) {
    return [{
      dimensions: { length: 0, width: 0, height: 0 },
      weight: 0,
    }]
  } else {
    return configurations
  }
}

export const getInputTypeForField = (field: string) => {
  const column = boardConfig.columns[field as ColumnTitles];
  if (!column) return 'text';
  
  switch (column.type) {
    case ColumnTypes.Dropdown:
      return 'select';
    case ColumnTypes.Date:
      return 'date';
    case ColumnTypes.Number:
      return 'number';
    default:
      return 'text';
  }
};