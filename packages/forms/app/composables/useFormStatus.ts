import { computed, readonly, toValue, type ComputedRef, type Ref } from "vue";

import { FormStatus } from "../types/formStatus";

/**
 * Derives the detailed boolean flags from a `FormStatus`.
 */
export function useFormStatus(status: Readonly<Ref<FormStatus>>) {
  const isPristine = computed(() => toValue(status) === FormStatus.PRISTINE);
  const isDirty = computed(() => toValue(status) === FormStatus.DIRTY);
  const hasError = computed(() => toValue(status) === FormStatus.ERROR);
  const isPending = computed(() => toValue(status) === FormStatus.PENDING);

  return {
    isPristine: readonly(isPristine),
    isDirty: readonly(isDirty),
    hasError: readonly(hasError),
    isPending: readonly(isPending),
  };
}

/**
 * Computes the aggregate status of a collection of form items.
 *
 * Pending wins over everything (a pending child makes the whole tree pending),
 * then error, then dirty; a collection with no items is pristine.
 */
export function useAggregateStatus<T extends { status: Readonly<Ref<FormStatus>> | FormStatus }>(
  items: Readonly<Ref<Array<T>>>,
  additionalPending?: Readonly<Ref<boolean>>,
): ComputedRef<FormStatus> {
  return computed(() => {
    if (additionalPending && toValue(additionalPending)) {
      return FormStatus.PENDING;
    }

    let hasError = false;
    let isDirty = false;

    for (const item of items.value) {
      const status = toValue(item.status);

      if (status === FormStatus.PENDING) {
        return FormStatus.PENDING;
      }

      if (status === FormStatus.ERROR) {
        hasError = true;
        continue;
      }

      if (status === FormStatus.DIRTY) {
        isDirty = true;
      }
    }

    if (hasError) {
      return FormStatus.ERROR;
    }

    if (isDirty) {
      return FormStatus.DIRTY;
    }

    return FormStatus.PRISTINE;
  });
}
