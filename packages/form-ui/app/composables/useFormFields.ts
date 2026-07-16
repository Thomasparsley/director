import { computed, isRef, toValue, type ComputedRef, type Ref } from "vue";

import type {
  FormControl,
  MaybeUnwrapedFormControl,
  UnwrapedFormControl,
} from "#layers/director-forms/app/composables/useFormControl";
import type { ValidatorResponse } from "#layers/director-forms/app/types/validation";

interface FormFields<T, S> {
  fieldValue: Ref<T, S>
  fieldHasError: ComputedRef<boolean>
  fieldError: ComputedRef<ValidatorResponse>
}

/**
 * Normalizes a FormControl for template binding: a writable `fieldValue` ref plus the
 * error state, regardless of whether the control arrives raw or reactive()-unwrapped
 * (e.g. plucked from a form group in a template).
 */
export function useFormFields<T, S>(
  inputControl: MaybeUnwrapedFormControl<T, S>,
): FormFields<T, S> {
  const fieldHasError = computed(() => toValue(inputControl.hasError));
  const fieldError = computed(() => toValue(inputControl.error));

  if (isRef(inputControl.data)) {
    const control = inputControl as FormControl<T, S>;

    return {
      fieldValue: control.data,
      fieldHasError,
      fieldError,
    };
  }

  const control = inputControl as UnwrapedFormControl<T, S>;

  const fieldValue = computed({
    get: () => control.data as T,
    set: (value) => {
      control.data = value as UnwrapedFormControl<T, S>["data"];
    },
  }) as Ref<T, S>;

  return {
    fieldValue,
    fieldHasError,
    fieldError,
  };
}
