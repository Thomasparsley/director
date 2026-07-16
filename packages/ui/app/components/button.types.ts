import type { buttonStyleVariants } from "./button.variants";

type ButtonStyleParameters = NonNullable<Parameters<typeof buttonStyleVariants>[0]>;

export type ButtonVariant = ButtonStyleParameters["variant"];
export type ButtonColor = ButtonStyleParameters["color"];
export type ButtonSize = ButtonStyleParameters["size"];

export type ButtonType = "button" | "submit" | "reset";

export interface DButtonProps {
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  readonly color?: ButtonColor
  /** Element or component to render as — e.g. "a" for a link that looks like a button. */
  readonly as?: string
  readonly type?: ButtonType
  readonly disabled?: boolean
}
