import {
  CalendarDate,
  CalendarDateTime,
  Time,
  getLocalTimeZone,
  toCalendarDate,
  toCalendarDateTime,
  fromDate,
  type DateValue,
} from "@internationalized/date";

// The forms layer models dates as plain `Date` (useDateFormControl) and times as "HH:mm[:ss]"
// strings — both transport-friendly. The reka-based fields speak @internationalized/date.
// These conversions are the bridge, always in the user's local time zone.

export type DateGranularity = "day" | "hour" | "minute" | "second";

/** `Date` → calendar value for the date fields; invalid/absent dates become undefined. */
export function dateToDateValue(
  date: Date | null | undefined,
  granularity: DateGranularity = "day",
): DateValue | undefined {
  if (!date || Number.isNaN(date.getTime())) {
    return undefined;
  }

  const zoned = fromDate(date, getLocalTimeZone());

  return granularity === "day"
    ? toCalendarDate(zoned)
    : toCalendarDateTime(zoned);
}

/** Calendar value → `Date`; undefined stays null so useDateFormControl coerces it. */
export function dateValueToDate(value: DateValue | null | undefined): Date | null {
  return value ? value.toDate(getLocalTimeZone()) : null;
}

/** "HH:mm" / "HH:mm:ss" → Time; anything unparsable becomes undefined. */
export function timeStringToTime(value: string | null | undefined): Time | undefined {
  if (!value) {
    return undefined;
  }

  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) {
    return undefined;
  }

  const [, hour, minute, second] = match;

  return new Time(Number(hour), Number(minute), Number(second ?? 0));
}

/** Time (or any time-carrying value) → "HH:mm", or "HH:mm:ss" with second granularity. */
export function timeToTimeString(
  value: { hour: number, minute: number, second?: number } | null | undefined,
  granularity: "hour" | "minute" | "second" = "minute",
): string | null {
  if (!value) {
    return null;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const base = `${pad(value.hour)}:${pad(value.minute)}`;

  return granularity === "second"
    ? `${base}:${pad(value.second ?? 0)}`
    : base;
}

export { CalendarDate, CalendarDateTime, Time };
