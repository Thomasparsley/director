import type { TimeValue } from "reka-ui";

import type { ControlSize } from "./control.variants";

export interface DTimeFieldProps {
  readonly id?: string
  /** Smallest editable unit. */
  readonly granularity?: "hour" | "minute" | "second"
  readonly minValue?: TimeValue
  readonly maxValue?: TimeValue
  readonly hourCycle?: 12 | 24
  readonly locale?: string
  readonly name?: string
  readonly disabled?: boolean
  readonly required?: boolean
  readonly invalid?: boolean
  readonly size?: ControlSize
}
