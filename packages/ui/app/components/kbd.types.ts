import type { DKbdKey } from "./kbd.keys";
import type { kbdStyleVariants } from "./kbd.variants";

type KbdStyleParameters = NonNullable<Parameters<typeof kbdStyleVariants>[0]>;

export type KbdVariant = KbdStyleParameters["variant"];
export type KbdSize = KbdStyleParameters["size"];

export interface DKbdProps {
  /**
   * The key to show. Named keys ("meta", "shift", "enter", ...) render as the glyph for
   * the current platform; anything else renders as given, e.g. "K". Ignored when the
   * default slot is filled.
   */
  readonly value?: DKbdKey | (string & {})
  readonly variant?: KbdVariant
  readonly size?: KbdSize
}
