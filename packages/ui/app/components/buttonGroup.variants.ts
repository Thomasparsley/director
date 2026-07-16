import { cva } from "class-variance-authority";

// Button group: buttons welded into one control, the way GitHub's "Fork ▾" or a
// toolbar's split button reads — one object with seams, not three separate keys.
//
// The group owns nothing but geometry: children keep their own variant/color/size, and
// the group only squares off the inner corners, pulls the seams together so neighbouring
// rings overlap into a single hairline, and lifts whichever child is hovered or focused
// above its neighbours so its ring draws unbroken.
//
// NOTE: `[&>*+*]:` (adjacent sibling) rather than `:not(:first-child)` — the parens inside
// an arbitrary variant would be eaten by the variant-group transformer.

const buttonGroupBase
  = ":uno: isolate inline-flex [&>*]:relative [&>*]:rounded-none [&>*:hover]:z-10 [&>*:focus-visible]:z-10 [&>*:focus-within]:z-10";

export const buttonGroupVariants = cva(buttonGroupBase, {
  variants: {
    orientation: {
      horizontal: ":uno: flex-row items-center [&>*+*]:-ml-px [&>*:first-child]:rounded-l-lg [&>*:last-child]:rounded-r-lg",
      vertical: ":uno: flex-col items-stretch [&>*+*]:-mt-px [&>*:first-child]:rounded-t-lg [&>*:last-child]:rounded-b-lg",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});
