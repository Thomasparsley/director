import type { ValidatorResponse } from "../types/validation";

import type { FormControl } from "../composables/useFormControl";

import { ValidationError } from "./validationError";

interface RequiredValidatorConfig {
  errorMessage?: string;
}

/**
 * Creates a validator that rejects empty values: `undefined`, `null`, blank
 * strings, and invalid or zero-time dates.
 */
export function requiredValidator(config?: RequiredValidatorConfig) {
  const message = config?.errorMessage ?? "This field is required.";

  return function <T>(value: T): ValidatorResponse {
    if (value === undefined || value === null) {
      return new ValidationError(message);
    }
    if (typeof value === "string" && value.trim() === "") {
      return new ValidationError(message);
    }
    if (value instanceof Date) {
      const time = value.getTime();
      if (time === 0 || isNaN(time)) {
        return new ValidationError(message);
      }
    }
  };
}

interface ValueEqualsToValidatorConfig {
  errorMessage?: string;
}

/**
 * Creates a validator that checks the value equals another control's current value —
 * e.g. a password confirmation field.
 */
export function valueEqualsToValidator<T, S>(
  control: FormControl<T, S>,
  config?: ValueEqualsToValidatorConfig,
) {
  return function (value: T): ValidatorResponse {
    if (value !== control.data.value) {
      return new ValidationError(config?.errorMessage ?? "Values do not match.");
    }
  };
}
