import {
  differenceInCalendarDays,
  differenceInCalendarWeeks,
  format,
  parse,
  subDays,
} from "date-fns";

/**
 * Converts a Date object to ISO date string (YYYY-MM-DD)
 */
export function getTodayDateStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function getYesterdayDateStr(): string {
  return format(subDays(new Date(), 1), "yyyy-MM-dd");
}

/**
 * Parses an ISO date string (YYYY-MM-DD) into a Date object
 */
export function fromDateStr(dateStr: string): Date {
  return parse(dateStr, "yyyy-MM-dd", new Date());
}

/**
 * Returns an absolute date string for a given date string
 * @param dateStr - The date string to get the absolute date for
 * @returns An absolute date string (e.g. "11/02/2025")
 */
export function toAbsoluteDateStr(dateStr: string): string {
  const targetDate = fromDateStr(dateStr);
  return format(targetDate, "MMM dd, yyyy");
}

/**
 * Returns a relative date string for a given date string
 * @param dateStr - The date string to get the relative date for
 * @returns A relative date string (e.g. "today", "yesterday", "tomorrow", "Monday", "last week, Tuesday", "2 weeks ago", "next week, Friday")
 */
export function toRelativeDateStr(dateStr: string): string {
  const targetDate = fromDateStr(dateStr);
  const now = new Date();
  const diffDays = differenceInCalendarDays(now, targetDate);
  const diffWeeks = differenceInCalendarWeeks(now, targetDate, {
    weekStartsOn: 1,
  });

  const weekDay = format(targetDate, "EEEE");

  if (diffDays === 0) return `Today`;
  if (diffDays === 1) return `Yesterday`;
  if (diffDays === -1) return `Tomorrow`;

  if (diffWeeks === 0) {
    return `This ${weekDay}`;
  }

  if (diffWeeks === 1 || diffWeeks === -1) {
    return `${diffWeeks > 0 ? "Next" : "Last"} week, ${weekDay}`;
  }

  if (diffWeeks < 0) {
    return `${Math.abs(diffWeeks)} weeks ago, ${weekDay}`;
  }

  return `In ${Math.abs(diffWeeks)} weeks, ${weekDay}`;
}
