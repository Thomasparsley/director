import type { AllowNull } from "#layers/director-common/app/types/null";
import type { GetRefType } from "#layers/director-common/app/types/ref";

import type { FormBase } from "../composables/useFormBase";
import type { FormControl, UnwrapedFormControl } from "../composables/useFormControl";
import type { FormGroup, UnwrapedFormGroup } from "../composables/useFormGroup";
import type { ArrayFormGroup, UnwrapedArrayFormGroup } from "../composables/useArrayFormGroup";
import type { KvForm, UnwrapedKvForm } from "../composables/useKvForm";

/**
 * Recursively extracts the plain data type from a form abstraction, or from a record
 * of form abstractions (a form group's controls object).
 *
 * Branch order matters: every abstraction is checked from the most specific interface
 * to the least specific one, and a record of controls is the fallback.
 */
export type InnerFormType<T>
  // Key-value form
  = T extends KvForm<infer K, infer F> ? Partial<Record<K, InnerFormType<F>>>
    : T extends UnwrapedKvForm<infer K, infer F> ? Partial<Record<K, InnerFormType<F>>>
    // Array group
      : T extends ArrayFormGroup<infer F> ? Array<InnerFormType<F>>
        : T extends UnwrapedArrayFormGroup<infer F> ? Array<InnerFormType<F>>
        // Group
          : T extends FormGroup<infer U, infer Nullable> ? AllowNull<InnerFormType<U>, Nullable>
            : T extends UnwrapedFormGroup<infer U, infer Nullable> ? AllowNull<InnerFormType<U>, Nullable>
            // Control
              : T extends FormControl<infer U, infer _S> ? GetRefType<U>
                : T extends UnwrapedFormControl<infer U> ? GetRefType<U>
                // An abstract FormBase carries no data type
                  : T extends FormBase ? unknown
                  // Record of controls (a group's controls object)
                    : { [K in keyof T]: InnerFormType<T[K]> };

/**
 * Recursively extracts the *setter* data type from a form abstraction — the type a
 * `patch()` accepts. Differs from `InnerFormType` for controls whose write type `S`
 * is wider than their read type `T` (e.g. a date control accepting `Date | string`).
 */
export type InnerFormSetterType<T>
  // Key-value form
  = T extends KvForm<infer K, infer F> ? Partial<Record<K, InnerFormSetterType<F>>>
    : T extends UnwrapedKvForm<infer K, infer F> ? Partial<Record<K, InnerFormSetterType<F>>>
    // Array group
      : T extends ArrayFormGroup<infer F> ? Array<InnerFormSetterType<F>>
        : T extends UnwrapedArrayFormGroup<infer F> ? Array<InnerFormSetterType<F>>
        // Group
          : T extends FormGroup<infer U, infer Nullable> ? AllowNull<InnerFormSetterType<U>, Nullable>
            : T extends UnwrapedFormGroup<infer U, infer Nullable> ? AllowNull<InnerFormSetterType<U>, Nullable>
            // Control
              : T extends FormControl<infer _U, infer S> ? GetRefType<S>
                : T extends UnwrapedFormControl<infer _U, infer S> ? GetRefType<S>
                // An abstract FormBase carries no data type
                  : T extends FormBase ? unknown
                  // Record of controls (a group's controls object)
                    : { [K in keyof T]: InnerFormSetterType<T[K]> };

/**
 * The plain data type produced by a form — an alias of `InnerFormType` kept for
 * call-site readability when typing a whole form's return value.
 */
export type FormReturnType<T> = InnerFormType<T>;
