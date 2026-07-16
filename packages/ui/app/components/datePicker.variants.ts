import { cva } from "class-variance-authority";

// Calendar pieces of <DDatePicker>. The popover shell itself is the shared
// controlPopoverVariants; these style what lives inside it.

/** Prev/next month chevron buttons in the calendar header. */
export const calendarNavButtonVariants = cva(
  ":uno: inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition-colors duration-100 hover:(bg-black/6 vtext-1) disabled:(cursor-not-allowed opacity-40) dark:text-gray-400 dark:hover:bg-white/10",
);

export const calendarHeadCellVariants = cva(
  ":uno: h-8 w-8 text-center text-xs font-medium vtext-4",
);

/**
 * A single day. Selected = the tinted-glass primary fill the buttons use; today gets a
 * dot marker via the ::after pseudo so it survives selection.
 */
export const calendarCellTriggerVariants = cva(
  ":uno: relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-sm vtext-1 outline-none transition-colors duration-100 hover:bg-black/6 focus-visible:(ring-2 ring-primary-400/70) dark:hover:bg-white/10 data-[selected]:(bg-primary-500/90 text-white ring-1 ring-primary-400/50 hover:bg-primary-500) data-[outside-view]:vtext-4 data-[disabled]:(pointer-events-none opacity-40) data-[unavailable]:(pointer-events-none line-through opacity-40) data-[today]:after:(absolute bottom-1 left-1/2 h-1 w-1 rounded-full bg-primary-500 content-empty -translate-x-1/2) data-[selected]:after:bg-white data-[selected]:shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.35)]",
);
