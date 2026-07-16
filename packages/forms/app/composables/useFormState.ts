import { toValue, type Ref } from "vue";

import type { StatefulForm } from "../types/forms";

/**
 * State management (pristine/dirty, reset, save) for a single form control.
 */
export function useFormState<T, S = T>(
  data: Ref<T, S>,
  originalData: Ref<T>,
  wasTouched: Ref<boolean>,
  error?: Ref<unknown>,
): StatefulForm {
  function markAsPristine(): void {
    wasTouched.value = false;
    if (error) {
      error.value = null;
    }
  }

  function markAsDirty(): void {
    wasTouched.value = true;
  }

  function reset(): void {
    // Writes the raw original value back, bypassing transformers on purpose:
    // the original value already went through them (or predates them by design).
    data.value = originalData.value as unknown as S;
    markAsPristine();
  }

  function save(): void {
    originalData.value = toValue(data);
    markAsPristine();
  }

  return {
    markAsPristine,
    markAsDirty,
    reset,
    save,
  };
}

/**
 * State management for a collection of form items — every operation is delegated
 * to each item.
 */
export function useCollectionState<T extends StatefulForm>(
  getItems: () => Array<T>,
): StatefulForm {
  function markAsPristine(): void {
    for (const item of getItems()) {
      item.markAsPristine();
    }
  }

  function markAsDirty(): void {
    for (const item of getItems()) {
      item.markAsDirty();
    }
  }

  function reset(): void {
    for (const item of getItems()) {
      item.reset();
    }
  }

  function save(): void {
    for (const item of getItems()) {
      item.save();
    }
  }

  return {
    markAsPristine,
    markAsDirty,
    reset,
    save,
  };
}
