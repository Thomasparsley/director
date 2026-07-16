import { describe, expect, test } from "vitest";

import { useFormControl } from "../composables/useFormControl";

import {
  arrayItemsValidator,
  arrayLengthValidator,
  arrayOneOfValidator,
  dateBeforeOrEqualValidator,
  dateBeforeValidator,
  emailValidator,
  numberPositiveIntegerValidator,
  numberRangeValidator,
  requiredValidator,
  stringMaxLengthValidator,
  stringMinLengthValidator,
  valueEqualsToValidator,
} from ".";

describe("requiredValidator", () => {
  const validator = requiredValidator();

  test("rejects empty values", () => {
    expect(validator(undefined)?.message).toBe("This field is required.");
    expect(validator(null)?.message).toBe("This field is required.");
    expect(validator("   ")?.message).toBe("This field is required.");
    expect(validator(new Date(""))?.message).toBe("This field is required.");
    expect(validator(new Date(0))?.message).toBe("This field is required.");
  });

  test("accepts present values", () => {
    expect(validator("John")).toBeUndefined();
    expect(validator(0)).toBeUndefined();
    expect(validator(false)).toBeUndefined();
    expect(validator(new Date("2024-05-01"))).toBeUndefined();
  });

  test("supports a custom message", () => {
    expect(requiredValidator({ errorMessage: "Custom" })(null)?.message).toBe("Custom");
  });
});

describe("valueEqualsToValidator", () => {
  test("compares against the other control's current value", () => {
    const password = useFormControl("secret");
    const validator = valueEqualsToValidator(password);

    expect(validator("secret")).toBeUndefined();
    expect(validator("other")?.message).toBe("Values do not match.");

    password.data.value = "other";
    expect(validator("other")).toBeUndefined();
  });
});

describe("string validators", () => {
  test("stringMaxLengthValidator", () => {
    const validator = stringMaxLengthValidator(3);

    expect(validator("abc")).toBeUndefined();
    expect(validator("abcd")?.message).toBe("Value must be at most 3 characters long.");
  });

  test("stringMinLengthValidator", () => {
    const validator = stringMinLengthValidator(3);

    expect(validator("abc")).toBeUndefined();
    expect(validator("ab")?.message).toBe("Value must be at least 3 characters long.");
  });
});

describe("number validators", () => {
  test("numberRangeValidator", () => {
    const validator = numberRangeValidator(1, 10);

    expect(validator(1)).toBeUndefined();
    expect(validator(10)).toBeUndefined();
    expect(validator(0)?.message).toBe("Value must be between 1 and 10.");
    expect(validator(11)?.message).toBe("Value must be between 1 and 10.");
  });

  test("numberPositiveIntegerValidator", () => {
    const validator = numberPositiveIntegerValidator();

    expect(validator(5)).toBeUndefined();
    expect(validator(0)?.message).toBe("Value must be a positive integer.");
    expect(validator(-1)?.message).toBe("Value must be a positive integer.");
    expect(validator(1.5)?.message).toBe("Value must be a positive integer.");
  });
});

describe("array validators", () => {
  test("arrayItemsValidator returns the first failing item's error", async () => {
    const validator = arrayItemsValidator(numberPositiveIntegerValidator());

    expect(await validator([1, 2, 3])).toBeUndefined();
    expect((await validator([1, -2, -3]))?.message).toBe("Value must be a positive integer.");
  });

  test("arrayOneOfValidator", () => {
    const validator = arrayOneOfValidator(["a", "b"]);

    expect(validator("a")).toBeUndefined();
    expect(validator("c")?.message).toBe("Current value is not one of the valid values.");
  });

  test("arrayLengthValidator", () => {
    const validator = arrayLengthValidator({
      min: { length: 1 },
      max: { length: 2 },
    });

    expect(validator(["a"])).toBeUndefined();
    expect(validator([])?.message).toBe("Value must contain at least 1 items.");
    expect(validator(["a", "b", "c"])?.message).toBe("Value must contain at most 2 items.");
  });
});

describe("date validators", () => {
  const bound = () => new Date("2024-06-01T00:00:00Z");

  test("dateBeforeValidator", () => {
    const validator = dateBeforeValidator(bound);

    expect(validator(new Date("2024-05-01T00:00:00Z"))).toBeUndefined();
    expect(validator(new Date("2024-06-01T00:00:00Z"))?.message)
      .toBe("Date must be before the allowed limit.");
    expect(validator(new Date("2024-07-01T00:00:00Z"))?.message)
      .toBe("Date must be before the allowed limit.");
  });

  test("dateBeforeOrEqualValidator", () => {
    const validator = dateBeforeOrEqualValidator(bound);

    expect(validator(new Date("2024-06-01T00:00:00Z"))).toBeUndefined();
    expect(validator(new Date("2024-07-01T00:00:00Z"))?.message)
      .toBe("Date must be on or before the allowed limit.");
  });

  test("skips validation when the bound or the value is invalid", () => {
    expect(dateBeforeValidator(() => null)(new Date("2024-05-01"))).toBeUndefined();
    expect(dateBeforeValidator(bound)(new Date(""))).toBeUndefined();
  });
});

describe("emailValidator", () => {
  const validator = emailValidator();

  test("accepts valid and empty emails", () => {
    expect(validator("john@example.com")).toBeUndefined();
    expect(validator("")).toBeUndefined();
  });

  test("reports targeted failure reasons", () => {
    expect(validator("johnexample.com")?.message).toBe("Email must contain an '@' symbol.");
    expect(validator("@example.com")?.message).toBe("Email must contain a local part before '@'.");
    expect(validator("john@")?.message).toBe("Email must contain a domain part after '@'.");
    expect(validator("john@example")?.message).toBe("Email must contain a top-level domain (e.g. .com).");
    expect(validator("john doe@example.com")?.message).toBe("Value must be a valid email address.");
  });

  test("supports a message function receiving the reason", () => {
    const custom = emailValidator({ errorMessage: reason => `bad: ${reason}` });

    expect(custom("johnexample.com")?.message).toBe("bad: MissingAtSymbol");
  });
});
