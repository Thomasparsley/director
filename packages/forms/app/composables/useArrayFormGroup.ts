import { computed, ref, type ComputedRef, type UnwrapRef } from "vue";

import type { InnerFormType } from "../types/innerFormTypes";
import type { PatchForm, PatchFormOptions } from "../types/patching";

import { type FormBase, useFormBase } from "./useFormBase";
import type { FormGroup, UnwrapedFormGroup } from "./useFormGroup";
import { useAggregateStatus } from "./useFormStatus";
import { useCollectionState } from "./useFormState";
import { useCollectionValidation } from "./useValidation";

// `any` on purpose: FormGroup is invariant in its controls type (setControls/patch),
// so a constraint of FormGroup<unknown> would reject every concrete group.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFormGroup = FormGroup<any, boolean>;

export interface ArrayFormGroupConfig<TForm> {
  /**
   * Builds a new item group. `patch()` calls it to grow the collection when the
   * patched array is longer than the current one.
   */
  constructor: (index: number) => TForm
}

/**
 * A resizable list of form groups sharing one shape — repeated sections like
 * addresses, contacts, or line items.
 */
export interface ArrayFormGroup<TForm extends AnyFormGroup = AnyFormGroup> extends FormBase {
  readonly data: ComputedRef<Array<InnerFormType<TForm>>>

  readonly controls: UnwrapRef<Array<TForm>>

  readonly addControl: (newControl: TForm) => void

  readonly removeControl: (index: number) => void

  readonly clearControls: () => void

  /**
   * Patches item-by-item: existing groups are patched in place, missing groups are
   * built via the constructor, and surplus groups are dropped.
   */
  readonly patch: (values: Array<PatchForm<TForm>>, options?: PatchFormOptions) => void
}

export type UnwrapedArrayFormGroup<TForm extends AnyFormGroup = AnyFormGroup>
  = UnwrapRef<ArrayFormGroup<TForm>>;

export type MaybeUnwrapedArrayFormGroup<TForm extends AnyFormGroup = AnyFormGroup>
  = ArrayFormGroup<TForm> | UnwrapedArrayFormGroup<TForm>;

export function useArrayFormGroup<TForm extends AnyFormGroup>(
  initialControls: Array<TForm>,
  config: ArrayFormGroupConfig<TForm>,
): ArrayFormGroup<TForm> {
  const controls = ref(initialControls);

  const controlsList = computed<Array<UnwrapedFormGroup>>(() =>
    controls.value as Array<UnwrapedFormGroup>,
  );

  const data = computed(() =>
    controlsList.value.map(control => control.data) as Array<InnerFormType<TForm>>,
  );

  const status = useAggregateStatus(controlsList);
  const state = useCollectionState(() => controlsList.value);
  const validation = useCollectionValidation(() => controlsList.value);

  function addControl(newControl: TForm): void {
    controls.value = [...controls.value, newControl] as UnwrapRef<Array<TForm>>;
  }

  function removeControl(index: number): void {
    if (index >= 0 && index < controls.value.length) {
      controls.value = controls.value.filter((_, i) => i !== index);
    }
  }

  function clearControls(): void {
    controls.value = [];
  }

  function patch(values: Array<PatchForm<TForm>>, options?: PatchFormOptions): void {
    for (let index = 0; index < values.length; index++) {
      if (index < controls.value.length) {
        (controls.value[index] as UnwrapedFormGroup).patch(values[index] as never, options);
      }
      else {
        const newControl = config.constructor(index);
        newControl.patch(values[index] as never, options);
        addControl(newControl);
      }
    }

    if (values.length < controls.value.length) {
      controls.value.splice(values.length);
    }
  }

  return {
    data,
    get controls() {
      return controls.value as UnwrapRef<Array<TForm>>;
    },

    ...useFormBase(status, { ...state, ...validation }),

    addControl,
    removeControl,
    clearControls,
    patch,
  };
}
