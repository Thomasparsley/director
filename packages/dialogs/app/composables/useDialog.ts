import { markRaw, shallowRef, type ComputedRef } from "vue";

import type { EmitsToEvents } from "#layers/director-common/app/types/components";

import type { DialogInstance, SheetDirection } from "../types/dialogInstance";

import { useDialogInstance } from "./useDialogInstance";

/**
 * `props` and `emits` are required exactly when the component declares them, so a
 * dialog with no props takes no `props` key rather than an empty object.
 *
 * The `[T] extends [undefined]` brackets are load-bearing. A naked type parameter makes
 * the conditional distributive, so a component whose props are a discriminated union
 * would demand a `ComputedRef` of one arm or the other — and a `ComputedRef` of the
 * union satisfies neither. Wrapping both sides in a tuple checks the union as a whole.
 */
type DialogConfig<TProps, TEmits> = {
  isCloseable?: boolean

  /** Called on every close, whatever triggered it. */
  onClose?: () => void

  withPadding?: boolean

  /** Keep the dialog registered when the opening component unmounts. Defaults to unregistering on unmount. */
  unregisterOnUnmount?: boolean
}
& ([TProps] extends [undefined] ? { props?: undefined } : { props: ComputedRef<TProps> })
& ([TEmits] extends [undefined] ? { emits?: undefined } : { emits: EmitsToEvents<TEmits> });

/** Registers `component` as a centred modal. */
export function useModalDialog<TProps = undefined, TEmits = undefined, T = unknown>(
  component: T,
  config: DialogConfig<TProps, TEmits>,
) {
  const instance: DialogInstance = {
    type: "Modal",
    component: markRaw(component as object),
    isOpen: shallowRef(false),
    props: config.props,
    emits: config.emits,
    isCloseable: config.isCloseable ?? false,
    withPadding: config.withPadding ?? true,
  };

  return useDialogInstance(instance, {
    unregisterOnUnmount: config.unregisterOnUnmount,
    onClose: config.onClose,
  });
}

/** Registers `component` as a sheet sliding in from `direction` (default `right`). */
export function useSheetDialog<TProps = undefined, TEmits = undefined, T = unknown>(
  component: T,
  config: DialogConfig<TProps, TEmits> & { direction?: SheetDirection },
) {
  const instance: DialogInstance = {
    type: "Sheet",
    component: markRaw(component as object),
    isOpen: shallowRef(false),
    props: config.props,
    emits: config.emits,
    isCloseable: config.isCloseable ?? false,
    withPadding: config.withPadding ?? true,
    direction: config.direction ?? "right",
  };

  return useDialogInstance(instance, {
    unregisterOnUnmount: config.unregisterOnUnmount,
    onClose: config.onClose,
  });
}
