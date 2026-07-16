import { readonly, type ComputedRef, type Ref } from "vue";

import { FormStatus } from "../types/formStatus";
import type { StatefulForm } from "../types/forms";
import type { Validatable } from "../types/validation";

import { useFormStatus } from "./useFormStatus";

/**
 * Base interface shared by every form abstraction: status flags, pristine/dirty
 * state management, and validation.
 */
export interface FormBase extends StatefulForm, Validatable {
  readonly status: Readonly<Ref<FormStatus>>
  readonly isPristine: Readonly<Ref<boolean>>
  readonly isDirty: Readonly<Ref<boolean>>
  readonly hasError: Readonly<Ref<boolean>>
  readonly isPending: Readonly<Ref<boolean>>
}

/**
 * Assembles the shared base of a form abstraction from its status source and its
 * state/validation operations.
 */
export function useFormBase(
  status: Ref<FormStatus> | ComputedRef<FormStatus>,
  operations: StatefulForm & Validatable,
): FormBase {
  return {
    status: readonly(status),
    ...useFormStatus(status),
    ...operations,
  };
}
