import { CalendarDate, CalendarDateTime, Time } from "@internationalized/date";
import { describe, expect, it } from "vitest";

import { dateToDateValue, dateValueToDate, timeStringToTime, timeToTimeString } from "./date";

describe("dateToDateValue", () => {
  it("converts a Date to a CalendarDate with day granularity", () => {
    const value = dateToDateValue(new Date(2026, 6, 16, 14, 30));

    expect(value).toBeInstanceOf(CalendarDate);
    expect(value?.toString()).toBe("2026-07-16");
  });

  it("keeps the time with sub-day granularity", () => {
    const value = dateToDateValue(new Date(2026, 6, 16, 14, 30), "minute");

    expect(value).toBeInstanceOf(CalendarDateTime);
    expect(value?.toString()).toContain("T14:30");
  });

  it("treats null and invalid dates as empty", () => {
    expect(dateToDateValue(null)).toBeUndefined();
    expect(dateToDateValue(new Date(""))).toBeUndefined();
  });
});

describe("dateValueToDate", () => {
  it("round-trips through dateToDateValue", () => {
    const original = new Date(2026, 6, 16);
    const roundTripped = dateValueToDate(dateToDateValue(original));

    expect(roundTripped?.getFullYear()).toBe(2026);
    expect(roundTripped?.getMonth()).toBe(6);
    expect(roundTripped?.getDate()).toBe(16);
  });

  it("maps empty back to null", () => {
    expect(dateValueToDate(undefined)).toBeNull();
  });
});

describe("timeStringToTime", () => {
  it("parses HH:mm and HH:mm:ss", () => {
    expect(timeStringToTime("14:30")).toEqual(new Time(14, 30));
    expect(timeStringToTime("09:05:59")).toEqual(new Time(9, 5, 59));
  });

  it("treats empty and malformed values as empty", () => {
    expect(timeStringToTime(null)).toBeUndefined();
    expect(timeStringToTime("")).toBeUndefined();
    expect(timeStringToTime("not-a-time")).toBeUndefined();
  });
});

describe("timeToTimeString", () => {
  it("formats to HH:mm by default and pads single digits", () => {
    expect(timeToTimeString(new Time(9, 5))).toBe("09:05");
  });

  it("includes seconds with second granularity", () => {
    expect(timeToTimeString(new Time(9, 5, 7), "second")).toBe("09:05:07");
  });

  it("maps empty to null", () => {
    expect(timeToTimeString(null)).toBeNull();
  });
});
