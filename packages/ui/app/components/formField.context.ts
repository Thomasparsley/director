import { computed, inject, provide, type ComputedRef } from "vue";

import type { ControlSize } from "./control.variants";

// DFormField → control handshake, the same trick Nuxt UI's FormField plays: the wrapper
// provides id/invalid/size, and any control rendered in its default slot picks them up
// without the caller wiring `for`/`aria-*` by hand. Controls outside a field fall back
// to their own props, so the injection is always optional.

export interface FormFieldContext {
  readonly id: ComputedRef<string | undefined>
  readonly invalid: ComputedRef<boolean>
  readonly size: ComputedRef<ControlSize | undefined>
}

const formFieldContextKey = Symbol("director:form-field");

export function provideFormFieldContext(context: FormFieldContext): void {
  provide(formFieldContextKey, context);
}

interface ControlFieldProps {
  readonly id?: string
  readonly invalid?: boolean
  readonly size?: ControlSize
}

interface ControlField {
  readonly id: ComputedRef<string | undefined>
  readonly invalid: ComputedRef<boolean>
  readonly size: ComputedRef<ControlSize | undefined>
}

/** Merges a control's own props with the surrounding DFormField context (props win). */
export function useFormFieldContext(props: ControlFieldProps): ControlField {
  const field = inject<FormFieldContext | null>(formFieldContextKey, null);

  return {
    id: computed(() => props.id ?? field?.id.value),
    // `||` rather than `??`: Vue casts an absent boolean prop to false, which must not
    // shadow the field's error state.
    invalid: computed(() => props.invalid || (field?.invalid.value ?? false)),
    size: computed(() => props.size ?? field?.size.value),
  };
}
