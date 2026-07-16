import { cva } from "class-variance-authority";

// Shared building blocks for every form control (input, select, number, date, time, pin).
// One place owns the macOS "liquid glass" control recipe — translucent fill + backdrop-blur +
// hairline ring + inset specular top edge — and the size scale, so the individual components
// stay thin, the way Nuxt UI components share a common theme.
//
// NOTE: arbitrary-value utilities (shadow-[...rgba(...)...]) stay OUTSIDE variant groups —
// the parens inside the brackets would close a `dark:(...)` group early.

/** The frosted fill + ring every control frame wears, before size/focus/invalid modifiers. */
const controlFrame
  = ":uno: rounded-lg vtext-1 backdrop-blur-md backdrop-saturate-150 bg-white/70 ring-1 ring-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all duration-200 dark:bg-white/8 dark:ring-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

const controlText
  = ":uno: placeholder:text-gray-400 dark:placeholder:text-gray-500";

/** Height/padding/type scale shared by every control, so all fields line up in a form row. */
const controlSizes = {
  sm: ":uno: h-8 px-2.5 text-xs",
  md: ":uno: h-9 px-3 text-sm",
  lg: ":uno: h-10 px-3.5 text-sm",
} as const;

export type ControlSize = keyof typeof controlSizes;

/**
 * A control that IS the focusable element (native <input>, <select>, a reka trigger):
 * the focus ring lands on :focus-visible.
 */
export const controlVariants = cva(
  [controlFrame, controlText, ":uno: w-full focus-visible:(outline-none ring-2 ring-primary-400/70) disabled:(cursor-not-allowed opacity-50)"],
  {
    variants: {
      size: controlSizes,
      invalid: {
        true: ":uno: ring-error-500/60 focus-visible:ring-error-400/70",
        false: "",
      },
    },
    defaultVariants: { size: "md", invalid: false },
  },
);

/**
 * A control frame that CONTAINS focusable elements (date/time segments, number field input):
 * the ring reacts to :focus-within instead. `data-[disabled]` covers reka roots, which mark
 * disabled state via attribute rather than the `disabled` property.
 */
export const controlFrameVariants = cva(
  [controlFrame, controlText, ":uno: flex w-full items-center focus-within:(ring-2 ring-primary-400/70) data-[disabled]:(cursor-not-allowed opacity-50)"],
  {
    variants: {
      size: controlSizes,
      invalid: {
        true: ":uno: ring-error-500/60 focus-within:ring-error-400/70",
        false: "",
      },
    },
    defaultVariants: { size: "md", invalid: false },
  },
);

/**
 * Floating surface for a control's popup (select listbox, date-picker calendar):
 * heavier glass than the controls, matching the drawer/panel recipe.
 */
export const controlPopoverVariants = cva(
  ":uno: z-50 min-w-32 overflow-hidden rounded-xl bg-white/85 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-black/10 shadow-xl dark:bg-gray-900/85 dark:ring-white/10",
);

/**
 * One editable segment of a date/time field (day, month, hour, ...). Focus highlights the
 * segment itself — the frame around it only shows the shared focus-within ring.
 */
export const controlSegmentVariants = cva(
  ":uno: rounded px-0.5 tabular-nums outline-none transition-colors duration-100 focus:bg-primary-500/20 data-[placeholder]:text-gray-400 data-[disabled]:cursor-not-allowed dark:data-[placeholder]:text-gray-500",
);
