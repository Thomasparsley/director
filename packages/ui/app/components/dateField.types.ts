import type { DateValue } from "@internationalized/date";

import type { ControlSize } from "./control.variants";

export interface DDateFieldProps {
  readonly id?: string
  /** Smallest editable unit; "day" gives a pure date, "minute"/"second" add time segments. */
  readonly granularity?: "day" | "hour" | "minute" | "second"
  readonly minValue?: DateValue
  readonly maxValue?: DateValue
  readonly hourCycle?: 12 | 24
  readonly locale?: string
  readonly name?: string
  readonly disabled?: boolean
  readonly required?: boolean
  readonly invalid?: boolean
  readonly size?: ControlSize
}
