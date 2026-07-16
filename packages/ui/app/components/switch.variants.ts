import { cva } from "class-variance-authority";

// Switch: a pill track with a sliding knob, on the same glass palette as the buttons —
// tinted primary glass when on, recessed neutral trough when off.

export const switchTrackVariants = cva(
  ":uno: relative inline-flex shrink-0 cursor-pointer items-center rounded-full ring-1 transition-all duration-200 focus-visible:(outline-none ring-2 ring-primary-400/70) data-[disabled]:(cursor-not-allowed opacity-50) data-[state=checked]:(bg-primary-500/90 ring-primary-400/50) data-[state=unchecked]:(bg-black/12 ring-black/10) dark:data-[state=unchecked]:(bg-white/12 ring-white/10) data-[state=checked]:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] data-[state=unchecked]:shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]",
  {
    variants: {
      size: {
        sm: ":uno: h-5 w-9",
        md: ":uno: h-6 w-11",
      },
      invalid: {
        true: ":uno: data-[state=unchecked]:ring-error-500/60",
        false: "",
      },
    },
    defaultVariants: { size: "md", invalid: false },
  },
);

export const switchThumbVariants = cva(
  ":uno: pointer-events-none block rounded-full bg-white transition-transform duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.25)]",
  {
    variants: {
      size: {
        sm: ":uno: h-4 w-4 data-[state=checked]:translate-x-4.5 data-[state=unchecked]:translate-x-0.5",
        md: ":uno: h-5 w-5 data-[state=checked]:translate-x-5.5 data-[state=unchecked]:translate-x-0.5",
      },
    },
    defaultVariants: { size: "md" },
  },
);
