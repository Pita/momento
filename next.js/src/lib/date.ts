import { format, parse } from "date-fns";

/**
 * Converts a Date object to ISO date string (YYYY-MM-DD)
 */
export function getTodayDateStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Parses an ISO date string (YYYY-MM-DD) into a Date object
 */
export function fromDateStr(dateStr: string): Date {
  return parse(dateStr, "yyyy-MM-dd", new Date());
}
