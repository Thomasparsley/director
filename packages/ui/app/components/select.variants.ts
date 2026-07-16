import { cva } from "class-variance-authority";

export const selectItemVariants = cva(
  ":uno: relative flex cursor-pointer select-none items-center rounded-lg py-1.5 pl-7 pr-2 text-sm vtext-1 outline-none transition-colors duration-100 data-[highlighted]:bg-primary-500/15 data-[disabled]:(pointer-events-none opacity-50) data-[state=checked]:font-medium",
);

export const selectItemIndicatorVariants = cva(
  ":uno: absolute left-1.5 inline-flex w-4 items-center justify-center text-primary-600 dark:text-primary-400",
);
