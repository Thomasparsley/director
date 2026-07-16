import { computed, ref, type Ref } from "vue";

import type { Promiseable } from "#layers/director-common/app/types/promise";

/**
 * Runs after a successful submit — returned by the submit function so follow-up
 * work (navigation, toasts) only happens when the submit itself succeeded.
 */
export type AfterSuccessSubmitFn = () => Promiseable<void>;

export type FormSubmitFn = () => Promiseable<AfterSuccessSubmitFn | undefined | void>;

/**
 * The structural contract `useFormSubmit` needs — fulfilled by `FormGroup` and
 * `KvForm`.
 */
export interface SubmittableForm {
  readonly isDirty: Readonly<Ref<boolean>>
  readonly isPending: Readonly<Ref<boolean>>
  readonly hasError: Readonly<Ref<boolean>>
  readonly validate: () => Promise<void>
  readonly setPending: (pending: boolean) => void
}

export interface FormSubmitConfig {
  /**
   * Called when the submit function throws. Defaults to `console.error`; pass your
   * own handler to surface the error (toast, logger, …).
   */
  onError?: (error: unknown) => void
}

/**
 * Submission workflow for a form: validates first, guards against double submits,
 * manages the pending state, and exposes `isDisabled` / `isLoading` for the UI.
 */
export function useFormSubmit(
  form: SubmittableForm,
  onSubmit: FormSubmitFn,
  config?: FormSubmitConfig,
) {
  const { isDirty, isPending, hasError } = form;

  const inSubmitState = ref(false);

  const isDisabled = computed(() =>
    inSubmitState.value
    || isPending.value
    || !isDirty.value
    || hasError.value,
  );

  const isLoading = computed(() => inSubmitState.value || isPending.value);

  async function executeSubmit(): Promise<void> {
    if (inSubmitState.value || isPending.value) {
      return;
    }

    inSubmitState.value = true;
    try {
      await form.validate();
      if (hasError.value) {
        return;
      }

      let afterFn: AfterSuccessSubmitFn | undefined | void;

      form.setPending(true);
      try {
        afterFn = await onSubmit();
      }
      catch (error) {
        (config?.onError ?? console.error)(error);
        return;
      }
      finally {
        form.setPending(false);
      }

      if (afterFn) {
        await afterFn();
      }
    }
    finally {
      inSubmitState.value = false;
    }
  }

  return {
    isDirty,
    isPending,
    hasError,
    isDisabled,
    isLoading,
    executeSubmit,
  };
}
