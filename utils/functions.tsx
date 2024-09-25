import { ColumnValue, Item, ColumnTypes, ProgressStatus, ColumnTitles, ItemSizes } from '../typings/types'
import { Badge } from "@/components/ui/badge"
import { format, addDays, isWithinInterval, isBefore, isToday, isEqual, parseISO, isAfter } from 'date-fns'
import { boardConfig } from '../config/boardconfig';
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Box } from '@/typings/interfaces';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
  const dueDate = parseISO(dateString)
  const now = new Date()
  const daysFromNow = addDays(now, range)

  if (isBefore(dueDate, now) || isEqual(dueDate, now)) {
    return <Badge variant="destructive">Overdue</Badge>
  } else if (isAfter(dueDate, now) && isBefore(dueDate, daysFromNow)) {
    return <Badge variant="destructive">Due</Badge>
  }
  return null
}

export const isPastDue = (item: Item) => {
  const dueDateValue = item.values.find(value => value.columnName === ColumnTitles.Due)
  if (dueDateValue && dueDateValue.text) {
    const dueDate = parseISO(dueDateValue.text)
    return isBefore(dueDate, new Date())
  }
  return false
}

export function getBoxData(size: ItemSizes): Box[] {
  const [width, length] = size.split(" x ").map(Number);

  const dimensionConfigs: { [key: string]: any } = {
    "14 x 7": [{ length: 44, width: 22, height: 4, weight: 12 }],
    "16 x 6": [{ length: 54, width: 22, height: 4, weight: 15 }],
    "16 x 10": [{ length: 39, width: 35, height: 7, weight: 40 }],
    "19 x 10": [{ length: 39, width: 35, height: 7, weight: 50 }],
    "22 x 10": [{ length: 39, width: 35, height: 7, weight: 60 }],
    "19 x 11": [{ length: 39, width: 35, height: 7, weight: 50 }],
    "22 x 11": [{ length: 41.5, width: 37, height: 6, weight: 65 }],
    "27 x 11": [
      { length: 39, width: 35, height: 7, weight: 50 },
      { length: 41, width: 32, height: 4, weight: 25 }
    ],
    "27 x 15": [
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 32, height: 5, weight: 35 }
    ],
    "31 x 15": [
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 26, height: 7, weight: 55 },
    ],
    "36 x 15": [
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
       length: "0", width: "0", height: "0" , weight: "0",
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