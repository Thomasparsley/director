import type { buttonGroupVariants } from "./buttonGroup.variants";

type ButtonGroupStyleParameters = NonNullable<Parameters<typeof buttonGroupVariants>[0]>;

export type ButtonGroupOrientation = ButtonGroupStyleParameters["orientation"];

export interface DButtonGroupProps {
  readonly orientation?: ButtonGroupOrientation
  /** Element to render as — the default <div> suits a toolbar cluster. */
  readonly as?: string
  /** Names the cluster for screen readers, e.g. "Fork options". */
  readonly label?: string
}
