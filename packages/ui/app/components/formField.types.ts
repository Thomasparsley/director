import type { ControlSize } from "./control.variants";

export interface DFormFieldProps {
  /** Id of the control the label points at. Provided to child controls via injection too. */
  readonly id?: string
  readonly label?: string
  /** Secondary text on the right side of the label row (e.g. "Optional"). */
  readonly hint?: string
  /** Text between the label and the control. */
  readonly description?: string
  /** Text under the control; hidden while an error is shown. */
  readonly help?: string
  /** Error message under the control. Also flips child controls into their invalid state. */
  readonly error?: string
  readonly required?: boolean
  readonly disabled?: boolean
  readonly size?: ControlSize
}
