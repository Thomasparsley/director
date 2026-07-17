import { cva } from "class-variance-authority";

import { surfaceFills, surfaceForeground, surfaceMuted } from "./surface.variants";

// The size scale is one row per part, read down the column: at `md` the icon is 8, the
// title sm, the description sm. Keeping the columns aligned is the point — an empty state
// is a single centred stack, and the parts only look right in proportion to each other.

export const emptyVariants = cva(
  ":uno: flex flex-col items-center justify-center rounded-xl text-center",
  {
    variants: {
      variant: surfaceFills,
      size: {
        xs: ":uno: gap-1 px-4 py-6",
        sm: ":uno: gap-1.5 px-4 py-8",
        md: ":uno: gap-2 px-6 py-10",
        lg: ":uno: gap-2.5 px-6 py-14",
        xl: ":uno: gap-3 px-8 py-20",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "md",
    },
  },
);

export const emptyIconVariants = cva(
  "",
  {
    variants: {
      variant: surfaceMuted,
      size: {
        xs: ":uno: h-5 w-5",
        sm: ":uno: h-6 w-6",
        md: ":uno: h-8 w-8",
        lg: ":uno: h-10 w-10",
        xl: ":uno: h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "md",
    },
  },
);

export const emptyTitleVariants = cva(
  ":uno: font-semibold",
  {
    variants: {
      variant: surfaceForeground,
      size: {
        xs: ":uno: text-xs",
        sm: ":uno: text-sm",
        md: ":uno: text-sm",
        lg: ":uno: text-base",
        xl: ":uno: text-lg",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "md",
    },
  },
);

export const emptyDescriptionVariants = cva(
  ":uno: max-w-sm text-balance",
  {
    variants: {
      variant: surfaceMuted,
      size: {
        xs: ":uno: text-xs",
        sm: ":uno: text-xs",
        md: ":uno: text-sm",
        lg: ":uno: text-sm",
        xl: ":uno: text-base",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "md",
    },
  },
);

/** The extra margin is on top of the root's gap — actions sit further out than the text does. */
export const emptyActionsVariants = cva(
  ":uno: flex flex-wrap items-center justify-center gap-2",
  {
    variants: {
      size: {
        xs: ":uno: mt-1",
        sm: ":uno: mt-1.5",
        md: ":uno: mt-2",
        lg: ":uno: mt-3",
        xl: ":uno: mt-4",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);
