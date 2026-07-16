import {
  computed,
  readonly,
  ref,
  toValue,
  type ComputedRef,
  type Ref,
  type UnwrapRef,
  type WritableComputedRef,
} from "vue";

import type { MaybeRef } from "#layers/director-common/app/types/ref";
import { useMaybeRef } from "#layers/director-common/app/composables/ref";

import { FormStatus } from "../types/formStatus";
import type { PatchFormOptions } from "../types/patching";
import type { TransformerFn } from "../types/transformer";
import type { Validator, ValidatorResponse } from "../types/validation";

import { applyTransformers } from "../utils/applyTransformers";

import { type FormBase, useFormBase } from "./useFormBase";
import { useFormState } from "./useFormState";
import { useValidation } from "./useValidation";

/**
 * Options for configuring a form control.
 *
 * @template T - The read type of the control's value.
 * @template S - The write type of the control's value (defaults to `T`).
 */
export interface FormControlConfig<T, S = T> {
  /**
   * Validators applied on `validate()`, in order. The first non-null result marks
   * the control as invalid.
   */
  validators?: Array<Validator<T>>

  /**
   * Validators that only run when all `validators` pass — use for expensive checks.
   */
  lazyValidators?: Array<Validator<T>>

  /** Transformers applied to every write of the control's value. */
  transformers?: Array<TransformerFn<S>>

  /** Transformers applied only when `transform()` is called (e.g. on blur). */
  lazyTransformers?: Array<TransformerFn<S>>

  /**
   * When true, patched scalar values are coerced into single-item arrays.
   * Defaults to whether the initial value is an array.
   */
  isArray?: boolean
}

/**
 * A single writable form value with validation, transformation, and
 * pristine/dirty tracking.
 */
export interface FormControl<T = unknown, S = T> extends FormBase {
  /** Writable value of the control; writes run the eager transformers. */
  data: WritableComputedRef<T, S>

  /** The value the control reverts to on `reset()`. Updated by `save()` and `patch(…, { write: true })`. */
  readonly originalData: ComputedRef<T>

  readonly isArray: boolean

  /** The validation error stored by the last `validate()` call, if any. */
  readonly error: Readonly<Ref<ValidatorResponse>>

  /** Applies the lazy transformers to the current value. */
  readonly transform: () => void

  readonly patch: (value: S, options?: PatchFormOptions) => void

  /** A read-only view of the control's value. */
  readonly toComputed: () => ComputedRef<T>

  /** A writable view whose setter patches the control. */
  readonly toWritableComputed: () => WritableComputedRef<T, S>
}

export type UnwrapedFormControl<T = unknown, S = T> = UnwrapRef<FormControl<T, S>>;

export type MaybeUnwrapedFormControl<T = unknown, S = T> = FormControl<T, S> | UnwrapedFormControl<T, S>;

export function useFormControl<T, S = T>(
  initialValue: MaybeRef<T, S>,
  // NoInfer keeps the config out of inference: otherwise a literal initial value
  // ("John") combined with validators locks T to the literal type.
  config?: FormControlConfig<NoInfer<T>, NoInfer<S>>,
): FormControl<T, S> {
  const {
    isArray = Array.isArray(toValue(initialValue)),
    validators = [],
    lazyValidators = [],
    transformers = [],
    lazyTransformers = [],
  } = config ?? {};

  const originalData = ref(toValue(initialValue)) as Ref<T>;
  const data = useMaybeRef(initialValue);
  const wasTouched = ref(false);
  const error = ref<ValidatorResponse>(null);

  const status = computed<FormStatus>(() =>
    error.value
      ? FormStatus.ERROR
      : wasTouched.value
        ? FormStatus.DIRTY
        : FormStatus.PRISTINE,
  );

  const dataWriter = computed<T, S>({
    get: () => data.value,
    set: (value: S) => {
      data.value = applyTransformers(toValue(value), transformers);
      wasTouched.value = true;
    },
  });

  const state = useFormState(data, originalData, wasTouched, error);

  const validation = useValidation(
    () => data.value as T,
    validators,
    lazyValidators,
    (err) => {
      error.value = err;
    },
  );

  function transform(): void {
    if (lazyTransformers.length > 0) {
      data.value = applyTransformers(data.value as unknown as S, lazyTransformers);
    }
  }

  function patch(value: S, options?: PatchFormOptions): void {
    dataWriter.value = isArray && !Array.isArray(value)
      ? [value] as S
      : value;

    if (options?.asPristine || options?.write) {
      state.markAsPristine();

      if (options?.write) {
        originalData.value = toValue(data);
      }
    }
  }

  function toComputed(): ComputedRef<T> {
    return computed(() => data.value);
  }

  function toWritableComputed(): WritableComputedRef<T, S> {
    return computed<T, S>({
      get: () => data.value,
      set: newValue => patch(newValue),
    });
  }

  return {
    data: dataWriter,
    originalData: computed(() => originalData.value),
    isArray,
    error: readonly(error),

    ...useFormBase(status, { ...state, ...validation }),

    transform,
    patch,
    toComputed,
    toWritableComputed,
  };
}
