import type { MaybeUnwrapedFormControl } from "#layers/director-forms/app/composables/useFormControl";
import type { ControlSize } from "#layers/director-ui/app/components/control.variants";

/** The FormControl a binding component drives. */
export interface FormControlBindingProps<T, S = T> {
  readonly control: MaybeUnwrapedFormControl<T, S>
}

/** DFormField chrome shared by every binding component. */
export interface FormFieldBindingProps {
  readonly label?: string
  readonly hint?: string
  readonly description?: string
  readonly help?: string
  readonly required?: boolean
  readonly disabled?: boolean
  readonly size?: ControlSize
}

export interface BaseFormBindingProps<T, S = T>
  extends FormControlBindingProps<T, S>, FormFieldBindingProps {}
