import { cva } from "class-variance-authority";

/** The −/+ stepper buttons flanking the number input, inside the shared control frame. */
export const inputNumberStepperVariants = cva(
  ":uno: inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-500 transition-colors duration-100 hover:(bg-black/6 vtext-1) disabled:(cursor-not-allowed opacity-40 hover:bg-transparent) dark:text-gray-400 dark:hover:bg-white/10",
  {
    variants: {
      size: {
        sm: ":uno: h-6 w-6",
        md: ":uno: h-7 w-7",
        lg: ":uno: h-8 w-8",
      },
    },
    defaultVariants: { size: "md" },
  },
);
