import type { Promiseable } from "#layers/director-common/app/types/promise";

import type { ValidationError } from "../validators/validationError";

/**
 * A validator returns a `ValidationError` when the value is invalid, and
 * `null`/`undefined` (or nothing) when it is valid.
 */
export type ValidatorResponse = ValidationError | null | undefined;

type ValidatorFn<T> = (value: T) => Promiseable<ValidatorResponse>;

export type Validator<T = unknown> = ValidatorFn<T> | ValidatorFn<T | undefined>;

/**
 * Interface for objects that support validation.
 */
export interface Validatable {
  /**
   * Runs all validators and returns the first error without touching the form's
   * error state.
   */
  readonly onlyValidate: () => Promise<ValidatorResponse>;

  /**
   * Runs all validators and stores the result in the form's error state.
   */
  readonly validate: () => Promise<void>;
}
