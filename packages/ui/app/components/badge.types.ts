import type { badgeStyleVariants } from "./badge.variants";

type BadgeStyleParameters = NonNullable<Parameters<typeof badgeStyleVariants>[0]>;

export type BadgeVariant = BadgeStyleParameters["variant"];
export type BadgeColor = BadgeStyleParameters["color"];
export type BadgeSize = BadgeStyleParameters["size"];

export interface DBadgeProps {
  readonly variant?: BadgeVariant
  readonly color?: BadgeColor
  readonly size?: BadgeSize
  /** Rendered as the badge content when no default slot is provided. */
  readonly label?: string | number
}
