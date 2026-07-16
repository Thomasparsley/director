import { cva } from "class-variance-authority";

// Toggle: a button that stays pressed. Off it wears the same clear glass as <DButton>;
// on it fills with tinted primary glass, so a pressed toggle reads like a held-down key.
//
// The size scale matches control.variants (h-8/h-9/h-10), so a toggle lines up with an
// input or a select in the same toolbar row.
//
// NOTE: arbitrary-value utilities (shadow-[...rgba(...)...]) stay OUTSIDE variant groups —
// the parens inside the brackets would close a `dark:(...)` group early.

const toggleBase
  = ":uno: inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-all duration-200 active:scale-98 focus-visible:(outline-none ring-2 ring-primary-400/70) data-[disabled]:(cursor-not-allowed opacity-50)";

/** Raised glass: a visible key whether it is on or off. Use in toolbars over content. */
const toggleDefault
  = ":uno: backdrop-blur-md backdrop-saturate-150 ring-1 data-[state=off]:(bg-white/60 vtext-1 ring-black/10 hover:bg-white/80) data-[state=on]:(bg-primary-500/90 text-white ring-primary-400/50 hover:bg-primary-500) dark:data-[state=off]:(bg-white/10 ring-white/10 hover:bg-white/15)";

const toggleDefaultShadows
  = ":uno: data-[state=off]:shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.35)] dark:data-[state=off]:shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]";

/** Flat until touched: the key only materialises on hover or when it turns on. */
const toggleGhost
  = ":uno: data-[state=off]:(bg-transparent vtext-3 hover:bg-black/6 hover:vtext-1) data-[state=on]:(bg-black/10 vtext-1) dark:data-[state=off]:hover:bg-white/10 dark:data-[state=on]:bg-white/15";

export const toggleVariants = cva(toggleBase, {
  variants: {
    variant: {
      default: [toggleDefault, toggleDefaultShadows],
      ghost: toggleGhost,
    },
    size: {
      sm: ":uno: h-8 text-xs",
      md: ":uno: h-9 text-sm",
      lg: ":uno: h-10 text-sm",
    },
    /** Icon-only: square, no horizontal padding to pull the glyph off-centre. */
    square: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    { square: false, size: "sm", className: ":uno: px-2.5" },
    { square: false, size: "md", className: ":uno: px-3" },
    { square: false, size: "lg", className: ":uno: px-3.5" },
    { square: true, size: "sm", className: ":uno: w-8" },
    { square: true, size: "md", className: ":uno: w-9" },
    { square: true, size: "lg", className: ":uno: w-10" },
  ],
  defaultVariants: {
    variant: "default",
    size: "md",
    square: false,
  },
});
