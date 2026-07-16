import type { ValidatorResponse } from "../types/validation";

import { ValidationError } from "./validationError";

interface NumberRangeValidatorConfig {
  errorMessage?: string;
}

/**
 * Creates a validator that checks the number falls within the inclusive range.
 */
export function numberRangeValidator(
  min: number,
  max: number,
  config?: NumberRangeValidatorConfig,
) {
  return function (value: number): ValidatorResponse {
    if (value < min || value > max) {
      const message = config?.errorMessage ?? `Value must be between ${min} and ${max}.`;
      return new ValidationError(message);
    }
  };
}

interface NumberPositiveIntegerValidatorConfig {
  errorMessage?: string;
}

/**
 * Creates a validator that checks the number is a positive integer.
 */
export function numberPositiveIntegerValidator(
  config?: NumberPositiveIntegerValidatorConfig,
) {
  return function (value: number): ValidatorResponse {
    if (!Number.isInteger(value) || value <= 0) {
      const message = config?.errorMessage ?? "Value must be a positive integer.";
      return new ValidationError(message);
    }
  };
}
