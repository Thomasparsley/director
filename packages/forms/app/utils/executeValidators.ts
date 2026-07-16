import type { Validator, ValidatorResponse } from "../types/validation";

/**
 * Executes validators in order and returns the first error found, or `null` when
 * the value passes all of them.
 *
 * A validator signals success by returning `null` or `undefined` — both must be
 * treated as "keep going", not as an early exit.
 */
export async function executeValidators<T>(
  value: T,
  validators: Array<Validator<T>>,
): Promise<ValidatorResponse> {
  for (const validator of validators) {
    const error = await validator(value);
    if (error != null) {
      return error;
    }
  }

  return null;
}
