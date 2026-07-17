import { createEventHook } from "@vueuse/core";
import { computed, onUnmounted } from "vue";

import type { DialogInstance } from "../types/dialogInstance";

import { useDialogManager } from "./useDialogManager";

export interface UseDialogInstanceOptions {
  /**
   * Unregister the dialog from the manager when the owning component unmounts.
   * Defaults to `true`. Set to `false` for a dialog that must survive its
   * opener being unmounted (e.g. opened right before navigating away).
   */
  unregisterOnUnmount?: boolean

  /** Called on every close, before `onCloseEvent` fires for anyone else. */
  onClose?: () => void
}

/**
 * Registers a dialog with the manager and hands back the handle used to drive it.
 * `useModalDialog` / `useSheetDialog` are the entry points; this is the shared half.
 */
export function useDialogInstance(
  instance: DialogInstance,
  options: UseDialogInstanceOptions = {},
) {
  const {
    unregisterOnUnmount = true,
    onClose,
  } = options;

  const manager = useDialogManager();

  const onCloseEvent = createEventHook();

  if (onClose) {
    onCloseEvent.on(onClose);
  }

  const [dialogId, registeredDialogInstance] = manager.registerDialog(instance);

  if (unregisterOnUnmount) {
    onUnmounted(() => {
      manager.unregisterDialog(dialogId);
    });
  }

  const isOpen = computed({
    get() {
      return registeredDialogInstance?.isOpen ?? false;
    },
    set(value) {
      if (registeredDialogInstance) {
        registeredDialogInstance.isOpen = value;
      }
    },
  });

  function openDialog() {
    manager.addToRender(dialogId);
    isOpen.value = true;
  }

  function closeDialog() {
    isOpen.value = false;
    manager.removeFromRender(dialogId);

    onCloseEvent.trigger();
  }

  return {
    isOpen,
    openDialog,
    closeDialog,
    onCloseEvent,
  };
}
