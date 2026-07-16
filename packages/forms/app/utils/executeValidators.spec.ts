import { describe, expect, test } from "vitest";

import { ValidationError } from "../validators/validationError";

import { executeValidators } from "./executeValidators";

describe("executeValidators", () => {
  test("returns null when every validator passes", async () => {
    const result = await executeValidators("value", [
      () => null,
      () => undefined,
    ]);

    expect(result).toBeNull();
  });

  test("returns the first error", async () => {
    const first = new ValidationError("first");
    const second = new ValidationError("second");

    const result = await executeValidators("value", [
      () => null,
      () => first,
      () => second,
    ]);

    expect(result).toBe(first);
  });

  test("a validator returning undefined does not stop the chain", async () => {
    // Regression: `undefined !== null` used to be treated as an error and
    // short-circuited the remaining validators.
    const error = new ValidationError("late error");

    const result = await executeValidators("value", [
      () => undefined,
      () => error,
    ]);

    expect(result).toBe(error);
  });

  test("supports async validators", async () => {
    const error = new ValidationError("async error");

    const result = await executeValidators("value", [
      async () => null,
      async () => error,
    ]);

    expect(result).toBe(error);
  });
});
