import { cva } from "class-variance-authority";

/** One pin cell: a square control frame with centered text. Sizes mirror the control heights. */
export const pinInputCellVariants = cva(
  ":uno: text-center font-medium",
  {
    variants: {
      size: {
        sm: ":uno: h-8 w-8 !px-0",
        md: ":uno: h-9 w-9 !px-0",
        lg: ":uno: h-10 w-10 !px-0",
      },
    },
    defaultVariants: { size: "md" },
  },
);
