import type { Validator, ValidatorResponse } from "../types/validation";

import { ValidationError } from "./validationError";

/**
 * Creates a validator that runs the given validator on every item of an array and
 * returns the first error found.
 */
export function arrayItemsValidator<T>(validator: Validator<T>) {
  return async function (value: Array<T>): Promise<ValidatorResponse> {
    for (const item of value) {
      const error = await validator(item);
      if (error != null) {
        return error;
      }
    }
  };
}

interface ArrayOneOfValidatorConfig<T> {
  errorMessage?: (value: unknown, allowedValues: Array<T>) => string;
}

/**
 * Creates a validator that checks the value is one of the allowed values.
 */
export function arrayOneOfValidator<T>(
  values: Array<T>,
  config?: ArrayOneOfValidatorConfig<T>,
) {
  return function (value: T): ValidatorResponse {
    if (!values.includes(value)) {
      const message = config?.errorMessage
        ? config.errorMessage(value, values)
        : "Current value is not one of the valid values.";

      return new ValidationError(message);
    }
  };
}

interface ArrayLengthValidatorConfig {
  min?: {
    length: number
    errorMessage?: string
  }
  max?: {
    length: number
    errorMessage?: string
  }
}

/**
 * Creates a validator that checks the array's length against the configured
 * minimum and/or maximum. A non-array value counts as length 0.
 */
export function arrayLengthValidator<T>(config: ArrayLengthValidatorConfig) {
  return function (value: T): ValidatorResponse {
    const length = Array.isArray(value) ? value.length : 0;

    if (config.min !== undefined && length < config.min.length) {
      const message = config.min.errorMessage ?? `Value must contain at least ${config.min.length} items.`;
      return new ValidationError(message);
    }
    if (config.max !== undefined && length > config.max.length) {
      const message = config.max.errorMessage ?? `Value must contain at most ${config.max.length} items.`;
      return new ValidationError(message);
    }
  };
}
