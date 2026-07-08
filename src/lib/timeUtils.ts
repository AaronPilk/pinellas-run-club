import { format, isToday, isTomorrow, parseISO } from 'date-fns';

/**
 * 1367 -> "22:47", 3862 -> "1:04:22"
 */
export function formatSecondsToTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * "22:47" -> 1367, "1:04:22" -> 3862. Throws a human-readable error on bad input.
 */
export function parseTimeToSeconds(value: string): number {
  const parts = value.trim().split(':').map(Number);

  if (parts.some(Number.isNaN)) {
    throw new Error('Enter a valid time, like 22:47 or 1:04:22');
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (seconds >= 60) throw new Error('Seconds must be below 60');
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (minutes >= 60 || seconds >= 60) {
      throw new Error('Minutes and seconds must be below 60');
    }
    return hours * 3600 + minutes * 60 + seconds;
  }

  throw new Error('Enter a valid time, like 22:47 or 1:04:22');
}

/**
 * Pace string, e.g. (1367s, 3.1mi) -> "7:21 / mi"
 */
export function formatPace(timeSeconds: number, distanceMiles: number): string {
  if (!distanceMiles || distanceMiles <= 0) return '--';
  return `${formatSecondsToTime(Math.round(timeSeconds / distanceMiles))} / mi`;
}

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value;
}

/** "Tonight" / "Tomorrow" / "Sat, Jul 12" */
export function formatEventDate(value: string | Date): string {
  const date = toDate(value);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

/** "6:30 PM" */
export function formatEventTime(value: string | Date): string {
  return format(toDate(value), 'h:mm a');
}

/** "Sat, Jul 12 · 6:30 PM" */
export function formatEventDateTime(value: string | Date): string {
  return `${formatEventDate(value)} · ${formatEventTime(value)}`;
}

/** "JUL" — for calendar chips on event cards */
export function formatMonthShort(value: string | Date): string {
  return format(toDate(value), 'MMM').toUpperCase();
}

/** "12" — day of month for calendar chips */
export function formatDayOfMonth(value: string | Date): string {
  return format(toDate(value), 'd');
}

/** "Jul 12, 2026" — for history rows */
export function formatFullDate(value: string | Date): string {
  return format(toDate(value), 'MMM d, yyyy');
}

/** Relative timestamp for feed posts: "2m", "4h", "3d", else "Jul 12" */
export function formatRelativeTime(value: string | Date): string {
  const date = toDate(value);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return format(date, 'MMM d');
}

/** "2026-07-08" — for date columns like run_date */
export function toDateOnlyString(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}
