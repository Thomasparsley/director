import { describe, expect, test } from "vitest";

import { requiredValidator } from "../validators";

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

  test("an unparsable string produces an Invalid Date without throwing", () => {
    const control = useDateFormControl("not a date");

    expect(control.data.value).toBeInstanceOf(Date);
    expect(isNaN(control.data.value.getTime())).toBe(true);
  });

  test("requiredValidator treats an invalid date as empty", async () => {
    const control = useDateFormControl(null, { validators: [requiredValidator()] });

    await control.validate();
    expect(control.hasError.value).toBe(true);

    control.data.value = "2024-06-15";
    await control.validate();
    expect(control.hasError.value).toBe(false);
  });

  test("patching null clears the date back to invalid", () => {
    const control = useDateFormControl("2024-06-15");

    control.patch(null);

    expect(isNaN(control.data.value.getTime())).toBe(true);
  });
});
