import type { ComputedRef, Ref } from "vue";

export type DialogInstanceType = "Modal" | "Sheet";

/** Edge a sheet slides in from. Only meaningful for `Sheet` dialogs. */
export type SheetDirection = "right" | "left" | "bottom" | "top";

/**
 * A dialog as the manager holds it: the component to paint, the props/emits to paint it
 * with, and whether it is currently open. Created by `useModalDialog` / `useSheetDialog`
 * and consumed by whatever renders `manager.instances`.
 */
export interface DialogInstance {
  readonly type: DialogInstanceType

  /** Marked raw by the composables — a component is never a reactive target. */
  readonly component: unknown

  readonly props?: ComputedRef<unknown>
  readonly emits?: unknown

  /** Whether the dialog paints its own close affordance and closes on overlay/escape. */
  readonly isCloseable: boolean

  readonly withPadding: boolean

  /** Edge the sheet slides in from. Defaults to `right`; ignored by modals. */
  readonly direction?: SheetDirection

  isOpen: Ref<boolean>
}
