import type { AcceptableValue } from "reka-ui";

import type { ControlSize } from "./control.variants";

export interface DSelectItem<T extends AcceptableValue = AcceptableValue> {
  readonly label: string
  readonly value: T
  readonly disabled?: boolean
}

export interface DSelectProps<T extends AcceptableValue = AcceptableValue> {
  readonly items: Array<DSelectItem<T>>
  readonly id?: string
  readonly placeholder?: string
  readonly name?: string
  readonly disabled?: boolean
  readonly required?: boolean
  readonly invalid?: boolean
  readonly size?: ControlSize
}
