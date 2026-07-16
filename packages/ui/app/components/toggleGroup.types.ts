import type { AcceptableValue } from "reka-ui";

import type { toggleGroupItemVariants } from "./toggleGroup.variants";

type ToggleGroupItemStyleParameters = NonNullable<Parameters<typeof toggleGroupItemVariants>[0]>;

export type ToggleGroupSize = ToggleGroupItemStyleParameters["size"];
export type ToggleGroupOrientation = "horizontal" | "vertical";

/** Single picks one item at a time (a segmented control); multiple lets several stay on. */
export type ToggleGroupType = "single" | "multiple";

export interface DToggleGroupProps {
  readonly type?: ToggleGroupType
  readonly size?: ToggleGroupSize
  readonly orientation?: ToggleGroupOrientation
  readonly disabled?: boolean
  readonly name?: string
  readonly required?: boolean
  /** When false, arrow keys no longer move focus between items. */
  readonly rovingFocus?: boolean
  /** When false, arrow-key focus stops at the last item instead of wrapping around. */
  readonly loop?: boolean
}

export interface DToggleGroupItemProps {
  /** Unique within the group — this is what lands in the group's model. */
  readonly value: AcceptableValue
  readonly disabled?: boolean
  /** Falls back to the group's size. */
  readonly size?: ToggleGroupSize
  /** Icon-only item: renders square, with the glyph centred. */
  readonly square?: boolean
  /** Required when the item is icon-only — the glyph alone says nothing to a screen reader. */
  readonly label?: string
}
