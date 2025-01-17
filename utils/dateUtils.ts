import { format, isValid, parseISO } from "date-fns";

export const parseDateSafely = (
  dateString: string | null | undefined
): Date | null => {
  if (!dateString) return null;

  // Try parsing as ISO date first
  const isoDate = parseISO(dateString);
  if (isValid(isoDate)) return isoDate;

  // Try regular Date parsing
  const date = new Date(dateString);
  return isValid(date) ? date : null;
};

export const formatDateSafely = (
  date: Date | string | null | undefined,
  formatString: string = "MM/dd/yyyy"
): string => {
  if (!date) return "";

  const parsedDate = typeof date === "string" ? parseDateSafely(date) : date;
  if (!parsedDate || !isValid(parsedDate)) return "Invalid date";

  try {
    return format(parsedDate, formatString);
  } catch {
    return "Invalid date";
  }
};
