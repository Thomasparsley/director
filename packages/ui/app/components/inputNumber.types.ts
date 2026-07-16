import type { ControlSize } from "./control.variants";

export interface DInputNumberProps {
  readonly id?: string
  readonly min?: number
  readonly max?: number
  readonly step?: number
  /** Intl.NumberFormat options — e.g. currency or percentage display. */
  readonly formatOptions?: Intl.NumberFormatOptions
  readonly locale?: string
  readonly placeholder?: string
  readonly name?: string
  readonly disabled?: boolean
  readonly required?: boolean
  readonly invalid?: boolean
  readonly size?: ControlSize
}
