import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";

const APPLICATION_WINDOW_DAYS = 30;

export const APPLY_WINDOW_DAYS = APPLICATION_WINDOW_DAYS;

export function today(): Date {
  return startOfDay(new Date());
}

export function isoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDate(iso: string): Date {
  return startOfDay(parseISO(iso));
}

export function todayISO(): string {
  return isoDate(today());
}

export function windowEnd(): Date {
  return addDays(today(), APPLICATION_WINDOW_DAYS);
}

export function isWithinWindow(date: Date): boolean {
  const start = today();
  const end = windowEnd();
  return !isBefore(date, start) && !isAfter(date, end);
}

export function isToday(date: Date): boolean {
  return isSameDay(date, today());
}

export function isPast(date: Date): boolean {
  return isBefore(date, today());
}

export type CalendarCell = {
  date: Date;
  iso: string;
  inMonth: boolean;
  isPast: boolean;
  isAvailable: boolean;
  label: string;
};

export type CalendarMonth = {
  monthDate: Date;
  monthLabel: string;
  cells: CalendarCell[];
  prevMonth: string | null;
  nextMonth: string | null;
};

function alignToSunday(date: Date): Date {
  const dow = date.getDay();
  return addDays(date, -dow);
}

export function buildCalendar(monthAnchor: Date): CalendarMonth {
  const monthStart = startOfMonth(monthAnchor);
  const monthEnd = endOfMonth(monthAnchor);
  const gridStart = alignToSunday(monthStart);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    cells.push({
      date: d,
      iso: isoDate(d),
      inMonth: d.getMonth() === monthStart.getMonth(),
      isPast: isPast(d),
      isAvailable: isWithinWindow(d) && !isPast(d),
      label: format(d, "d"),
    });
    if (i >= 27 && d.getMonth() !== monthStart.getMonth()) {
      break;
    }
  }

  const todayDate = today();
  const end = windowEnd();
  const nextAnchor = addMonths(monthStart, 1);
  const prevAnchor = addMonths(monthStart, -1);

  const nextMonth =
    !isAfter(startOfMonth(nextAnchor), end) ? isoDate(startOfMonth(nextAnchor)) : null;
  const prevMonth =
    !isBefore(endOfMonth(prevAnchor), startOfMonth(todayDate))
      ? isoDate(startOfMonth(prevAnchor))
      : null;

  return {
    monthDate: monthStart,
    monthLabel: format(monthStart, "MMMM yyyy"),
    cells,
    prevMonth,
    nextMonth,
  };
}

export function defaultMonthAnchor(): Date {
  return startOfMonth(today());
}

export function formatHumanDate(iso: string): string {
  return format(parseDate(iso), "EEEE, MMMM d");
}
