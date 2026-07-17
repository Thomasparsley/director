import { cva } from "class-variance-authority";

import {
  surfaceDividers,
  surfaceFills,
  surfaceForeground,
  surfaceMuted,
} from "./surface.variants";

// `divide-y` rather than a border-b on the header and a border-t on the footer: it draws a
// line only *between* rendered children, so a card with no footer, or with a body and
// nothing else, needs no conditional class. `of-hidden` keeps a full-bleed child (a table,
// an image) inside the rounded corners.
export const cardVariants = cva(
  ":uno: rounded-xl divide-y",
  {
    variants: {
      // `naked` is deliberately absent — a card with no surface is a <div>.
      variant: {
        solid: [surfaceFills.solid, surfaceDividers.solid],
        outline: [surfaceFills.outline, surfaceDividers.outline],
        soft: [surfaceFills.soft, surfaceDividers.soft],
        subtle: [surfaceFills.subtle, surfaceDividers.subtle],
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

/** Stacks the title over the description; also the padding box for a custom `#header`. */
export const cardHeaderVariants = cva(":uno: flex flex-col gap-1.5 px-4 py-3 sm:px-6");

export const cardBodyVariants = cva(":uno: px-4 py-4 sm:px-6");

export const cardFooterVariants = cva(":uno: px-4 py-3 sm:px-6");

export const cardTitleVariants = cva(
  ":uno: text-base font-semibold leading-none tracking-tight",
  {
    variants: {
      variant: surfaceForeground,
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

export const cardDescriptionVariants = cva(
  ":uno: text-sm",
  {
    variants: {
      variant: surfaceMuted,
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);
