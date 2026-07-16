import {
  computed,
  ref,
  watch,
  type ComputedRef,
  type UnwrapRef,
} from "vue";

import type { Promiseable } from "#layers/director-common/app/types/promise";

import type { InnerFormSetterType, InnerFormType } from "../types/innerFormTypes";
import type { PatchFormOptions } from "../types/patching";

import { createFormKey } from "../utils/formKey";

import { type FormBase, useFormBase } from "./useFormBase";
import type { UnwrapedFormGroupItem } from "./useFormGroup";
import { useAggregateStatus } from "./useFormStatus";
import { useCollectionState } from "./useFormState";
import { useCollectionValidation } from "./useValidation";

export interface KvFormConfig<
  K extends string = string,
  TForm extends FormBase = FormBase,
> {
  /**
   * Builds a control for a key that does not exist yet when `patch()` encounters it.
   * Without a builder, patches for unknown keys are ignored.
   */
  builder?: (key: K, value: InnerFormSetterType<TForm>) => TForm
}

/**
 * A dynamic dictionary of form items — for maps whose keys are not known in advance
 * (feature flags, translations, metadata …). Items can be controls or whole groups.
 */
export interface KvForm<
  K extends string = string,
  TForm extends FormBase = FormBase,
> extends FormBase {
  /** Identity of this form instance, e.g. for `:key` when swapping forms. */
  readonly key: string

  readonly data: ComputedRef<Partial<Record<K, InnerFormType<TForm>>>>

  readonly controls: UnwrapRef<Partial<Record<K, TForm>>>

  readonly keys: ComputedRef<Array<K>>

  readonly getControl: (key: K) => UnwrapRef<TForm> | undefined
  readonly setControl: (key: K, control: TForm) => void
  readonly removeControl: (key: K) => void
  readonly hasControl: (key: K) => boolean
  readonly clearControls: () => void

  readonly setPending: (pending: boolean) => void

  /** Runs the callback now, or once the pending state clears. */
  readonly afterPendingDone: (cb: () => Promiseable<void>) => void

  readonly patch: (
    value: Partial<Record<K, InnerFormSetterType<TForm>>>,
    options?: PatchFormOptions,
  ) => void
}

export type UnwrapedKvForm<
  K extends string = string,
  TForm extends FormBase = FormBase,
> = UnwrapRef<KvForm<K, TForm>>;

export type MaybeUnwrapedKvForm<
  K extends string = string,
  TForm extends FormBase = FormBase,
> = KvForm<K, TForm> | UnwrapedKvForm<K, TForm>;

export function useKvForm<
  K extends string = string,
  TForm extends FormBase = FormBase,
>(
  initialControls: Partial<Record<K, TForm>>,
  config?: KvFormConfig<K, TForm>,
): KvForm<K, TForm> {
  const key = createFormKey();

  const controls = ref(initialControls);
  const pending = ref(false);

  const controlsList = computed<Array<UnwrapedFormGroupItem>>(() =>
    Object.values(controls.value),
  );

  const keys = computed(() => Object.keys(controls.value) as Array<K>);

  const data = computed(() => {
    const result: Partial<Record<K, InnerFormType<TForm>>> = {};

    for (const controlKey of keys.value) {
      const control = controls.value[controlKey] as UnwrapedFormGroupItem;
      result[controlKey] = control.data as InnerFormType<TForm>;
    }

    return result;
  });

  const status = useAggregateStatus(controlsList, pending);
  const state = useCollectionState(() => controlsList.value);
  const validation = useCollectionValidation(() => controlsList.value);

  // The unwrapped generic record defeats TS indexing — view it through a concrete shape.
  function controlsRecord(): Partial<Record<K, UnwrapRef<TForm>>> {
    return controls.value as Partial<Record<K, UnwrapRef<TForm>>>;
  }

  function getControl(controlKey: K): UnwrapRef<TForm> | undefined {
    return controlsRecord()[controlKey];
  }

  function setControl(controlKey: K, control: TForm): void {
    controlsRecord()[controlKey] = control as UnwrapRef<TForm>;
  }

  function removeControl(controlKey: K): void {
    delete controlsRecord()[controlKey];
  }

  function hasControl(controlKey: K): boolean {
    return controlKey in controls.value;
  }

  function clearControls(): void {
    controls.value = {};
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

  function patch(
    value: Partial<Record<K, InnerFormSetterType<TForm>>>,
    options?: PatchFormOptions,
  ): void {
    for (const patchKey in value) {
      const controlKey = patchKey as K;
      const patchValue = value[controlKey] as InnerFormSetterType<TForm>;

      if (!hasControl(controlKey)) {
        if (!config?.builder) {
          continue;
        }

        setControl(controlKey, config.builder(controlKey, patchValue));
      }

      // Read back through `controls` so we patch the reactive (unwrapped) instance.
      const control = controls.value[controlKey] as UnwrapedFormGroupItem;
      control.patch(patchValue as never, options);
    }
  }

  return {
    key,
    data,
    get controls() {
      return controls.value as UnwrapRef<Partial<Record<K, TForm>>>;
    },
    keys,

    ...useFormBase(status, { ...state, ...validation }),

    getControl,
    setControl,
    removeControl,
    hasControl,
    clearControls,
    setPending,
    afterPendingDone,
    patch,
  };
}
