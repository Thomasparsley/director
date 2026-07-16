import type { DeepPartial } from "#layers/director-common/app/types/partial";

import type { InnerFormSetterType } from "./innerFormTypes";

/**
 * Interface for patchable form elements.
 */
export interface Patchable<T> {
  readonly patch: (value: T, options?: PatchFormOptions) => void;
}

/**
 * Options controlling how form state is updated when new values are applied.
 */
export interface PatchFormOptions {
  /**
   * When true, the form is considered untouched (pristine) after the patch is applied.
   * Useful when programmatically filling a form without flagging it as user-modified.
   *
   * @default false
   */
  asPristine?: boolean

  /**
   * When true, the patch behaves like loading a fresh form instance: values are applied,
   * the form is marked pristine, AND the original data is overwritten — so a later
   * `reset()` returns to the patched values, not the ones from construction time.
   *
   * @default false
   */
  write?: boolean
}

/**
 * Partial patch payload for a form: every field is optional, recursively, and typed by
 * the setter side of each control.
 *
 * @example
 * type UserForm = {
 *   name: FormControl<string>;
 *   address: FormGroup<{ city: FormControl<string> }>;
 * };
 *
 * const patchData: PatchForm<UserForm> = { address: { city: "New York" } };
 */
export type PatchForm<T> = DeepPartial<InnerFormSetterType<T>>;

/**
 * Complete patch payload for a form. Unlike `PatchForm`, all fields are required —
 * useful for setting the initial state of a form.
 */
export type InitialPatchForm<T> = InnerFormSetterType<T>;
