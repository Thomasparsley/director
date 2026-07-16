import type { InputHTMLAttributes } from "vue";

import type { ControlSize } from "./control.variants";

export interface DInputProps {
  readonly id?: string
  readonly type?: InputHTMLAttributes["type"]
  readonly name?: string
  readonly placeholder?: string
  readonly autocomplete?: string
  readonly maxLength?: number
  readonly disabled?: boolean
  readonly required?: boolean
  readonly invalid?: boolean
  readonly size?: ControlSize
}
