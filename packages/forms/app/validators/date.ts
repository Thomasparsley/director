import type { ValidatorResponse } from "../types/validation";

import { ValidationError } from "./validationError";

function resolveBound(bound: () => Date | null | undefined): Date | null {
  const value = bound();
  if (!(value instanceof Date) || isNaN(value.getTime())) {
    return null;
  }

  return value;
}

interface DateBoundValidatorConfig {
  errorMessage?: string;
}

/**
 * Creates a validator that checks the date is strictly before the bound resolved by
 * the given accessor. When the bound or the value is not a valid date, validation
 * is skipped — combine with `requiredValidator` to enforce presence.
 *
 * @param bound - Accessor returning the upper bound (evaluated lazily at validation time).
 */
export function dateBeforeValidator(
  bound: () => Date | null | undefined,
  config?: DateBoundValidatorConfig,
) {
  return function (value: Date): ValidatorResponse {
    const boundValue = resolveBound(bound);
    if (boundValue === null || !(value instanceof Date) || isNaN(value.getTime())) {
      return;
    }

    if (value.getTime() >= boundValue.getTime()) {
      return new ValidationError(config?.errorMessage ?? "Date must be before the allowed limit.");
    }
  };
}

/**
 * Creates a validator that checks the date is before or equal to the bound resolved
 * by the given accessor. When the bound or the value is not a valid date, validation
 * is skipped — combine with `requiredValidator` to enforce presence.
 *
 * @param bound - Accessor returning the upper bound (evaluated lazily at validation time).
 */
export function dateBeforeOrEqualValidator(
  bound: () => Date | null | undefined,
  config?: DateBoundValidatorConfig,
) {
  return function (value: Date): ValidatorResponse {
    const boundValue = resolveBound(bound);
    if (boundValue === null || !(value instanceof Date) || isNaN(value.getTime())) {
      return;
    }

    if (value.getTime() > boundValue.getTime()) {
      return new ValidationError(config?.errorMessage ?? "Date must be on or before the allowed limit.");
    }
  };
}
