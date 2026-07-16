import { describe, expect, test } from "vitest";

import { useDateFormControl } from "./useDateFormControl";

describe("useDateFormControl", () => {
  test("initializes from a Date", () => {
    const date = new Date("2024-05-01T00:00:00Z");
    const control = useDateFormControl(date);

    expect(control.data.value).toBe(date);
  });

  test("initializes from a string", () => {
    const control = useDateFormControl("2024-05-01T00:00:00Z");

    expect(control.data.value).toBeInstanceOf(Date);
    expect(control.data.value.toISOString()).toBe("2024-05-01T00:00:00.000Z");
  });

  test("initializes from null as an invalid date", () => {
    const control = useDateFormControl(null);

    expect(control.data.value).toBeInstanceOf(Date);
    expect(isNaN(control.data.value.getTime())).toBe(true);
  });

  test("writes coerce strings into dates", () => {
    const control = useDateFormControl(null);

    control.data.value = "2024-06-15T12:00:00Z";

    expect(control.data.value).toBeInstanceOf(Date);
    expect(control.data.value.toISOString()).toBe("2024-06-15T12:00:00.000Z");
    expect(control.isDirty.value).toBe(true);
  });

  test("patch coerces strings into dates", () => {
    const control = useDateFormControl(null);

    control.patch("2024-06-15T12:00:00Z", { asPristine: true });

    expect(control.data.value.toISOString()).toBe("2024-06-15T12:00:00.000Z");
    expect(control.isPristine.value).toBe(true);
  });
});
