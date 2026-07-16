import { cva } from "class-variance-authority";

/** Padding adjustments when an icon sits inside the control; the frame comes from controlVariants. */
export const inputAffixVariants = cva("", {
  variants: {
    leading: {
      true: ":uno: pl-8",
      false: "",
    },
    trailing: {
      true: ":uno: pr-8",
      false: "",
    },
  },
  defaultVariants: { leading: false, trailing: false },
});

/** Icon slot inside the control, vertically centered and inert to clicks. */
export const inputAffixSlotVariants = cva(
  ":uno: pointer-events-none absolute top-1/2 flex items-center text-gray-400 -translate-y-1/2 dark:text-gray-500",
  {
    variants: {
      side: {
        leading: ":uno: left-2.5",
        trailing: ":uno: right-2.5",
      },
    },
  },
);
