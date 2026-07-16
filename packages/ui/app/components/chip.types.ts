import type { chipStyleVariants } from "./chip.variants";

type ChipStyleParameters = NonNullable<Parameters<typeof chipStyleVariants>[0]>;

export type ChipColor = ChipStyleParameters["color"];
export type ChipSize = ChipStyleParameters["size"];

export interface DChipProps {
  readonly color?: ChipColor
  readonly size?: ChipSize
  /** Optional count/label. Omit for a plain dot. */
  readonly text?: string | number
  /** Hide the chip without unmounting the wrapped content. */
  readonly show?: boolean
}
