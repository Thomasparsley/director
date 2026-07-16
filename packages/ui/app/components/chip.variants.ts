import { cva } from "class-variance-authority";

export const chipStyleVariants = cva(
  // Vivid fill (a status pip has to read at 8px), but glass detailing: soft alpha ring to
  // lift it off any surface, drop shadow for depth, inset highlight for the specular edge.
  ":uno: flex items-center justify-center rounded-full font-medium tabular-nums ring-1 ring-white/80 shadow-[0_1px_2px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] dark:ring-gray-950/70",
  {
    variants: {
      color: {
        primary: ":uno: bg-primary-500 text-white",
        neutral: ":uno: bg-gray-500 text-white",
        info: ":uno: bg-info-500 text-white",
        success: ":uno: bg-success-500 text-white",
        warn: ":uno: bg-warn-500 text-white",
        error: ":uno: bg-error-500 text-white",
      },
      size: {
        // Dot-only sizes: no text, just a coloured pip.
        sm: ":uno: h-2 w-2 text-[0px]",
        md: ":uno: h-2.5 w-2.5 text-[0px]",
        lg: ":uno: h-3 w-3 text-[0px]",
      },
      /** Set when the chip carries text — widens the pip into a pill. */
      text: {
        true: ":uno: h-auto w-auto min-w-4 px-1 py-0 text-[10px] leading-4",
        false: "",
      },
      /** Absolutely positioned over the wrapped content (vs. rendered inline). */
      overlay: {
        true: ":uno: absolute z-10",
        false: ":uno: relative",
      },
    },
    compoundVariants: [
      { overlay: true, size: "sm", className: ":uno: -top-0.5 -right-0.5" },
      { overlay: true, size: "md", className: ":uno: -top-1 -right-1" },
      { overlay: true, size: "lg", className: ":uno: -top-1 -right-1" },
    ],
    defaultVariants: {
      color: "primary",
      size: "md",
      text: false,
      overlay: false,
    },
  },
);
