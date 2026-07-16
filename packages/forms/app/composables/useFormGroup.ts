import {
  computed,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type UnwrapRef,
} from "vue";

import type { AllowNull } from "#layers/director-common/app/types/null";
import type { Promiseable } from "#layers/director-common/app/types/promise";

import type { InnerFormType } from "../types/innerFormTypes";
import type { PatchForm, PatchFormOptions } from "../types/patching";

import { createFormKey } from "../utils/formKey";

import type { FormControl } from "./useFormControl";
import { type FormBase, useFormBase } from "./useFormBase";
import { useAggregateStatus } from "./useFormStatus";
import { useCollectionState } from "./useFormState";
import { useCollectionValidation } from "./useValidation";

/**
 * The structural contract a value must fulfill to live inside a form group's
 * controls object — controls, nested groups, array groups, and KV forms all match it.
 */
export type FormGroupItem<T = unknown, S = T> = Pick<
  FormControl<T, S>,
  "data" | "patch" | "status" | "isPristine" | "isDirty" | "hasError"
  | "markAsPristine" | "markAsDirty" | "onlyValidate" | "validate" | "reset" | "save"
>;

export type UnwrapedFormGroupItem<T = unknown, S = T> = UnwrapRef<FormGroupItem<T, S>>;

export interface FormGroupConfig<T, Nullable extends boolean> {
  /**
   * Builds a fresh controls object for a nullable group, used by
   * `constructControls()` and by `patch()` when the group is currently null.
   */
  constructor?: Nullable extends true ? () => T : never
}

export type FormGroupValue<T, Nullable extends boolean> = AllowNull<InnerFormType<T>, Nullable>;

/**
 * A fixed-shape record of form controls (or nested groups) whose status, data, and
 * operations aggregate over its children.
 */
export interface FormGroup<T = unknown, Nullable extends boolean = false> extends FormBase {
  /** Identity of this group instance, e.g. for `:key` when swapping forms. */
  readonly key: string

  readonly data: ComputedRef<FormGroupValue<T, Nullable>>

  readonly controls: UnwrapRef<AllowNull<T, Nullable>>

  readonly setControls: (newControls: AllowNull<T, Nullable>) => void

  /** Builds the controls via the configured constructor (nullable groups). */
  readonly constructControls: () => void

  /** Drops the controls back to null (nullable groups only). */
  readonly clearControls: () => void

  readonly setPending: (pending: boolean) => void

  /** Runs the callback now, or once the pending state clears. */
  readonly afterPendingDone: (cb: () => Promiseable<void>) => void

  readonly patch: (value: PatchForm<T>, options?: PatchFormOptions) => void
}

export type UnwrapedFormGroup<
  T = unknown,
  Nullable extends boolean = false,
> = UnwrapRef<FormGroup<T, Nullable>>;

export type MaybeUnwrapedFormGroup<
  T = unknown,
  Nullable extends boolean = false,
> = FormGroup<T, Nullable> | UnwrapedFormGroup<T, Nullable>;

export function useFormGroup<T, Nullable extends boolean = false>(
  initialControls: AllowNull<T, Nullable>,
  config?: FormGroupConfig<T, Nullable>,
): FormGroup<T, Nullable> {
  const key = createFormKey();
  const isNullable = (initialControls === null) as Nullable;

  const controls = ref((initialControls ?? (isNullable ? null : {})) as AllowNull<T, Nullable>);
  const pending = ref(false);

  const controlsList = computed<Array<UnwrapedFormGroupItem>>(() =>
    Object.values(controls.value ?? {}),
  );

  const data = computed(() => {
    // A nullable group without controls has no value — treat both null and an
    // emptied-out controls object as "no data" so payloads stay clean.
    if (isNullable && controlsList.value.length === 0) {
      return null as FormGroupValue<T, Nullable>;
    }

    const values = {} as Record<string, unknown>;

    for (const controlKey in controls.value) {
      const control = controls.value[controlKey as keyof UnwrapRef<AllowNull<T, Nullable>>] as UnwrapedFormGroupItem;
      values[controlKey] = control.data;
    }

    return values as FormGroupValue<T, Nullable>;
  });

  const status = useAggregateStatus(controlsList, pending);
  const state = useCollectionState(() => controlsList.value);
  const validation = useCollectionValidation(() => controlsList.value);

  function setControls(newControls: AllowNull<T, Nullable>): void {
    if (!isNullable && newControls === null) {
      return;
    }

    controls.value = newControls as UnwrapRef<AllowNull<T, Nullable>>;
  }

  function constructControls(): void {
    if (config?.constructor) {
      setControls(config.constructor());
    }
  }

  function clearControls(): void {
    if (isNullable) {
      setControls(null as AllowNull<T, Nullable>);
    }
  }

  function setPending(value: boolean): void {
    pending.value = value;
  }

  function afterPendingDone(cb: () => Promiseable<void>): void {
    if (!pending.value) {
      cb();
      return;
    }

    const unwatch = watch(pending, (newPending) => {
      if (!newPending) {
        unwatch();
        cb();
      }
    });
  }

  function patch(value: PatchForm<T>, options?: PatchFormOptions): void {
    if (isNullable && controlsList.value.length === 0) {
      if (!value || !config?.constructor) {
        return;
      }

      constructControls();
    }

    for (const patchKey in value) {
      const controlKey = patchKey as keyof UnwrapRef<AllowNull<T, Nullable>>;
      const control = controls.value?.[controlKey] as UnwrapedFormGroupItem | undefined;

      if (!control) {
        continue;
      }

      control.patch(toValue(value[patchKey as keyof PatchForm<T>]) as never, options);
    }
  }

  return {
    key,
    data,
    get controls() {
      return controls.value;
    },

    ...useFormBase(status, { ...state, ...validation }),

    setControls,
    constructControls,
    clearControls,
    setPending,
    afterPendingDone,
    patch,
  };
}
