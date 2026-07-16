import { cva } from "class-variance-authority";

export const navigationLinkVariants = cva(
  // No width here: `w-full` and a fixed width would both land in the class list and the
  // stylesheet order — not the class order — would decide. Each variant owns its width.
  ":uno: group relative inline-flex items-center gap-2.5 rounded-lg text-sm transition-all duration-200 focus-visible:(outline-none ring-2 ring-primary-400/70)",
  {
    variants: {
      collapsed: {
        // Fills the rail so the active highlight tracks the rail's width, whatever the shell sets.
        true: ":uno: h-9 w-full justify-center px-0",
        false: ":uno: w-full justify-start px-3 py-1.5",
      },
      active: {
        // Frosted glass pill: translucent white over whatever sits behind it, blurred and
        // saturated, with a specular top edge (the inset shadow) and a hairline ring.
        true: ":uno: font-medium vtext-1 bg-white/65 ring-1 ring-white/60 backdrop-blur-md backdrop-saturate-150 shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)] dark:bg-white/10 dark:ring-white/10 dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]",
        false: ":uno: vtext-2 hover:(vtext-1 bg-black/5) dark:hover:bg-white/8",
      },
      disabled: {
        true: ":uno: cursor-not-allowed opacity-50 pointer-events-none",
        false: "",
      },
    },
    defaultVariants: {
      collapsed: false,
      active: false,
      disabled: false,
    },
  },
);

/** Frosted overlay shared by the collapsed-rail flyout. */
export const navigationFlyoutClass = ":uno: z-50 min-w-52 flex flex-col gap-0.5 rounded-2xl p-1.5 bg-white/75 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/50 shadow-[0_16px_40px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.6)] dark:bg-gray-900/70 dark:ring-white/10 dark:shadow-[0_16px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]";

/** Glassy label tooltip shown next to the collapsed rail. */
export const navigationTooltipClass = ":uno: z-50 rounded-lg bg-gray-900/85 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/15 shadow-lg backdrop-blur-xl";
