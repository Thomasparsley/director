import type { Validatable, Validator, ValidatorResponse } from "../types/validation";

import { executeValidators } from "../utils/executeValidators";

/**
 * Validation for a single form control. `validators` run first, `lazyValidators`
 * only when all of them pass — use lazy for expensive checks (e.g. server calls).
 */
export function useValidation<T>(
  getValue: () => T,
  validators: Array<Validator<T>> = [],
  lazyValidators: Array<Validator<T>> = [],
  setError?: (error: ValidatorResponse) => void,
): Validatable {
  async function onlyValidate(): Promise<ValidatorResponse> {
    const value = getValue();

    return (await executeValidators(value, validators))
      ?? (await executeValidators(value, lazyValidators));
  }

  async function validate(): Promise<void> {
    const error = await onlyValidate();
    setError?.(error);
  }

  return {
    onlyValidate,
    validate,
  };
}

/**
 * Validation for a collection of form items. `onlyValidate` short-circuits on the
 * first error; `validate` always runs on every item so each stores its own error.
 */
export function useCollectionValidation<T extends Validatable>(
  getItems: () => Array<T>,
): Validatable {
  async function onlyValidate(): Promise<ValidatorResponse> {
    for (const item of getItems()) {
      const error = await item.onlyValidate();
      if (error != null) {
        return error;
      }
    }

    return null;
  }

  async function validate(): Promise<void> {
    for (const item of getItems()) {
      await item.validate();
    }
  }

  return {
    onlyValidate,
    validate,
  };
}
