import { cva } from "class-variance-authority";

// Toggle group: the macOS segmented control. The root is a recessed trough — a darkened
// well pressed into the surface — and the selected item is a raised glass pill floating
// inside it. Unselected items stay flat, so the eye reads exactly one thing as "on".
//
// Item heights are one step below the control scale because the root's p-0.5 adds the
// difference back: sm 28+4 = 32 (h-8), md 32+4 = 36 (h-9), lg 36+4 = 40 (h-10). A group
// therefore lines up with an input or a button of the same size.
//
// NOTE: arbitrary-value utilities (shadow-[...rgba(...)...]) stay OUTSIDE variant groups —
// the parens inside the brackets would close a `dark:(...)` group early.

export const toggleGroupRootVariants = cva(
  ":uno: inline-flex rounded-lg p-0.5 backdrop-blur-md backdrop-saturate-150 bg-black/6 ring-1 ring-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] dark:(bg-white/8 ring-white/10) dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]",
  {
    variants: {
      orientation: {
        horizontal: ":uno: flex-row items-center gap-0.5",
        vertical: ":uno: flex-col items-stretch gap-0.5",
      },
      disabled: {
        true: ":uno: cursor-not-allowed opacity-50",
        false: "",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
      disabled: false,
    },
  },
);

const toggleGroupItemBase
  = ":uno: inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-all duration-200 active:scale-98 focus-visible:(outline-none ring-2 ring-primary-400/70) data-[disabled]:(cursor-not-allowed opacity-50) data-[state=off]:(bg-transparent vtext-3 hover:vtext-1) data-[state=on]:(bg-white/90 vtext-1) dark:data-[state=on]:bg-white/18";

const toggleGroupItemShadows
  = ":uno: data-[state=on]:shadow-[0_1px_2px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)] dark:data-[state=on]:shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.12)]";

export const toggleGroupItemVariants = cva([toggleGroupItemBase, toggleGroupItemShadows], {
  variants: {
    size: {
      sm: ":uno: h-7 text-xs",
      md: ":uno: h-8 text-sm",
      lg: ":uno: h-9 text-sm",
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
    { square: true, size: "sm", className: ":uno: w-7" },
    { square: true, size: "md", className: ":uno: w-8" },
    { square: true, size: "lg", className: ":uno: w-9" },
  ],
  defaultVariants: {
    size: "md",
    square: false,
  },
});
