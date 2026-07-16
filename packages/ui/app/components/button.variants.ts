import { cva } from "class-variance-authority";

// NOTE: arbitrary-value utilities (shadow-[...rgba(...)...]) stay OUTSIDE variant groups —
// the parens inside the brackets would close a `dark:(...)` group early.
export const buttonStyleVariants = cva(
  ":uno: inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-200 active:scale-98 focus-visible:(outline-none ring-2 ring-primary-400/70) disabled:(cursor-not-allowed opacity-50)",
  {
    variants: {
      variant: {
        default: ":uno: text-sm backdrop-blur-md backdrop-saturate-150",
        // Compact frosted control for toolbars and icon buttons.
        control: ":uno: text-xs backdrop-blur-md backdrop-saturate-150 bg-white/70 text-gray-700 ring-1 ring-black/10 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] hover:bg-white/90 dark:bg-white/8 dark:text-gray-200 dark:ring-white/10 dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] dark:hover:bg-white/12",
      },
      color: {
        default: "",
        primary: "",
        success: "",
        warning: "",
        danger: "",
      },
      size: {
        default: ":uno: h-10 px-4 py-2",
        xs: ":uno: h-6 px-2 py-1 !text-xs",
        sm: ":uno: h-8 px-3 py-1",
        lg: ":uno: h-11 rounded-xl px-8",
        icon: ":uno: h-10 w-10",
        icon_sm: ":uno: h-8 w-8",
        icon_xs: ":uno: h-6 w-6",
        icon_xxs: ":uno: h-5 w-5",
      },
    },
    compoundVariants: [
      // Neutral: clear glass — translucent white over whatever sits behind it.
      { variant: "default", color: "default", className: ":uno: bg-white/60 vtext-1 ring-1 ring-black/10 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] hover:bg-white/80 dark:bg-white/10 dark:ring-white/10 dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] dark:hover:bg-white/15" },
      // Tinted glass fills: translucent accent with a specular top edge.
      { variant: "default", color: "primary", className: ":uno: bg-primary-500/90 text-white ring-1 ring-primary-400/50 shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.35)] hover:bg-primary-500" },
      { variant: "default", color: "success", className: ":uno: bg-success-600/90 text-white ring-1 ring-success-500/50 shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.3)] hover:bg-success-600" },
      { variant: "default", color: "warning", className: ":uno: bg-warn-500/90 text-white ring-1 ring-warn-400/50 shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.3)] hover:bg-warn-500" },
      { variant: "default", color: "danger", className: ":uno: bg-error-500/90 text-white ring-1 ring-error-400/50 shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.35)] hover:bg-error-500" },
    ],
    defaultVariants: {
      variant: "default",
      color: "default",
      size: "default",
    },
  },
);
