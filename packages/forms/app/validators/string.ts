import type { ValidatorResponse } from "../types/validation";

import { ValidationError } from "./validationError";

interface StringMaxLengthValidatorConfig {
  errorMessage?: string;
}

/**
 * Creates a validator that checks the string does not exceed the given length.
 */
export function stringMaxLengthValidator(
  maxLength: number,
  config?: StringMaxLengthValidatorConfig,
) {
  return function (value: string): ValidatorResponse {
    if (value.length > maxLength) {
      const message = config?.errorMessage ?? `Value must be at most ${maxLength} characters long.`;
      return new ValidationError(message);
    }
  };
}

interface StringMinLengthValidatorConfig {
  errorMessage?: string;
}

/**
 * Creates a validator that checks the string is at least the given length.
 */
export function stringMinLengthValidator(
  minLength: number,
  config?: StringMinLengthValidatorConfig,
) {
  return function (value: string): ValidatorResponse {
    if (value.length < minLength) {
      const message = config?.errorMessage ?? `Value must be at least ${minLength} characters long.`;
      return new ValidationError(message);
    }
  };
}
