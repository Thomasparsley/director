import type { toggleVariants } from "./toggle.variants";

type ToggleStyleParameters = NonNullable<Parameters<typeof toggleVariants>[0]>;

export type ToggleVariant = ToggleStyleParameters["variant"];
export type ToggleSize = ToggleStyleParameters["size"];

export interface DToggleProps {
  readonly id?: string
  readonly variant?: ToggleVariant
  readonly size?: ToggleSize
  /** Icon-only toggle: renders square, with the glyph centred. */
  readonly square?: boolean
  readonly disabled?: boolean
  /** Required when the toggle is icon-only — the glyph alone says nothing to a screen reader. */
  readonly label?: string
}
