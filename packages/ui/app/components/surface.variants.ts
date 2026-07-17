// Shared surface tokens for the components that paint a *panel* rather than a control:
// card and empty today. One place owns the four fills Nuxt UI names — solid / outline /
// soft / subtle — plus `naked`, so a card and the empty state inside it cannot drift apart.
//
// These are plain records, not a cva recipe: each consumer composes them into its own
// recipe (a card adds dividers and rounding, an empty state adds a size scale), and a cva
// that tried to serve both would grow a `component` variant. Compare control.variants.ts,
// which ships whole recipes because every control frame really is identical.
//
// NOTE: arbitrary-value utilities (shadow-[...rgba(...)...]) stay OUTSIDE variant groups —
// the parens inside the brackets would close a `dark:(...)` group early.

/** The panel fill, ring and shadow, before any rounding, padding or divider. */
export const surfaceFills = {
  // Inverted: the only fill that is opaque, so the text on it has to invert too.
  solid: ":uno: bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900",
  outline: ":uno: bg-white/70 ring-1 ring-black/10 backdrop-blur-md backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:bg-white/6 dark:ring-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  soft: ":uno: bg-white/45 backdrop-blur-md backdrop-saturate-150 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:bg-white/4 dark:shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
  subtle: ":uno: bg-white/60 ring-1 ring-black/8 backdrop-blur-md backdrop-saturate-150 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] dark:bg-white/6 dark:ring-white/10 dark:shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]",
  /** No surface at all — for an empty state dropped into a table or a card that already has one. */
  naked: "",
} as const;

export type SurfaceVariant = keyof typeof surfaceFills;

/** Hairline between a panel's sections. Keyed to the fill, because solid inverts. */
export const surfaceDividers = {
  solid: ":uno: divide-white/15 dark:divide-black/10",
  outline: ":uno: divide-black/8 dark:divide-white/10",
  soft: ":uno: divide-black/6 dark:divide-white/8",
  subtle: ":uno: divide-black/8 dark:divide-white/10",
  naked: "",
} as const satisfies Record<SurfaceVariant, string>;

/**
 * Strongest text on the surface (a title). `vtext-1` already flips for dark mode on its
 * own; solid needs both halves spelled out because it inverts against the mode.
 */
export const surfaceForeground = {
  solid: ":uno: text-white dark:text-gray-900",
  outline: ":uno: vtext-1",
  soft: ":uno: vtext-1",
  subtle: ":uno: vtext-1",
  naked: ":uno: vtext-1",
} as const satisfies Record<SurfaceVariant, string>;

/** Muted text on the surface (a description, an icon). */
export const surfaceMuted = {
  solid: ":uno: text-white/70 dark:text-gray-900/70",
  outline: ":uno: vtext-3",
  soft: ":uno: vtext-3",
  subtle: ":uno: vtext-3",
  naked: ":uno: vtext-3",
} as const satisfies Record<SurfaceVariant, string>;
