import { cva } from "class-variance-authority";

// Kbd: a physical-looking keycap. `default` is the raised key — the same clear glass as a
// button, shrunk down; `subtle` is the flat well for dense places like a menu row, where a
// row of raised caps would out-shout the label they belong to; `outline` is just the
// hairline, for sitting inside prose.
//
// min-w matching the height keeps a single glyph square, so ⌘K reads as two even caps.
//
// NOTE: arbitrary-value utilities (shadow-[...rgba(...)...]) stay OUTSIDE variant groups —
// the parens inside the brackets would close a `dark:(...)` group early.

const kbdBase
  = ":uno: inline-flex shrink-0 select-none items-center justify-center rounded-md font-medium font-sans";

export const kbdStyleVariants = cva(kbdBase, {
  variants: {
    variant: {
      default: ":uno: backdrop-blur-md backdrop-saturate-150 bg-white/70 vtext-2 ring-1 ring-black/10 dark:(bg-white/10 ring-white/10)",
      subtle: ":uno: bg-black/6 vtext-3 dark:bg-white/10",
      outline: ":uno: vtext-2 ring-1 ring-black/15 dark:ring-white/15",
    },
    size: {
      sm: ":uno: h-4 min-w-4 px-1 text-[10px]",
      md: ":uno: h-5 min-w-5 px-1.5 text-xs",
      lg: ":uno: h-6 min-w-6 px-2 text-sm",
    },
  },
  compoundVariants: [
    // The specular top edge and drop shadow that make the cap look pressable.
    { variant: "default", className: ":uno: shadow-[0_1px_2px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]" },
  ],
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});
