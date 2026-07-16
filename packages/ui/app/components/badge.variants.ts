import { cva } from "class-variance-authority";

export const badgeStyleVariants = cva(
  // Alpha tints over a blurred backdrop rather than opaque fills, so the badge picks up
  // whatever glass surface it sits on. The inset shadow is the specular top edge.
  ":uno: inline-flex items-center rounded-full cursor-default backdrop-blur-sm backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]",
  {
    variants: {
      variant: {
        default: "",
        subtle: ":uno: ring-1 ring-inset",
      },
      size: {
        xxs: ":uno: px-1.5 py-0.5 text-xs gap-0.5",
        xs: ":uno: px-2 py-1 text-xs font-medium gap-1",
        sm: ":uno: px-3 py-1 text-sm gap-1.5",
      },
      color: {
        primary: ":uno: bg-primary-500/15 text-primary-700 dark:(bg-primary-400/20 text-primary-300)",
        neutral: ":uno: bg-black/6 text-gray-700 dark:(bg-white/12 text-gray-300)",
        info: ":uno: bg-info-500/15 text-info-700 dark:(bg-info-400/20 text-info-300)",
        success: ":uno: bg-success-500/15 text-success-700 dark:(bg-success-400/20 text-success-300)",
        warn: ":uno: bg-warn-500/15 text-warn-700 dark:(bg-warn-400/20 text-warn-300)",
        error: ":uno: bg-error-500/15 text-error-700 dark:(bg-error-400/20 text-error-300)",
      },
    },
    compoundVariants: [
      { variant: "subtle", color: "primary", className: ":uno: ring-primary-400/30" },
      { variant: "subtle", color: "neutral", className: ":uno: ring-gray-400/30" },
      { variant: "subtle", color: "info", className: ":uno: ring-info-400/30" },
      { variant: "subtle", color: "success", className: ":uno: ring-success-400/30" },
      { variant: "subtle", color: "warn", className: ":uno: ring-warn-400/30" },
      { variant: "subtle", color: "error", className: ":uno: ring-error-400/30" },
    ],
    defaultVariants: {
      variant: "default",
      color: "neutral",
      size: "xs",
    },
  },
);
