import type { ControlSize } from "./control.variants";

export interface DPinInputProps {
  readonly id?: string
  /** Number of cells. */
  readonly length?: number
  readonly type?: "text" | "number"
  /** Marks the inputs as one-time-code so mobile keyboards offer the SMS code. */
  readonly otp?: boolean
  readonly mask?: boolean
  readonly placeholder?: string
  readonly name?: string
  readonly disabled?: boolean
  readonly required?: boolean
  readonly invalid?: boolean
  readonly size?: ControlSize
}
