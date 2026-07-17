import { computed, ref, type UnwrapRef } from "vue";
import { useNuxtApp } from "#app";

import type { DialogInstance } from "../types/dialogInstance";

type RegisteredDialogs = Record<string, UnwrapRef<DialogInstance>>;

interface DialogInstanceToRender {
  key: string
  instance: UnwrapRef<DialogInstance>
}

interface DialogManagerState {
  registeredDialogs: RegisteredDialogs
  toRender: DialogInstanceToRender[]
}

/**
 * How long a closed dialog stays mounted so its close transition can play out.
 * Kept here rather than at the call site because it is a property of the render
 * pipeline, not of any one dialog.
 */
const CLOSE_TRANSITION_MS = 333;

/** The app-wide manager, provided by the `dialogManagerInstance` plugin. */
export function useDialogManager() {
  const { $dialogManagerInstance } = useNuxtApp();
  return $dialogManagerInstance;
}

/**
 * Builds a dialog manager: a registry of dialogs plus the subset currently worth
 * painting (`instances`). One of these exists per Nuxt app — the plugin owns it, so
 * server-side requests never share dialog state. Call this directly only in tests.
 */
export function useDialogManagerInstance() {
  const state = ref<DialogManagerState>({
    registeredDialogs: {},
    toRender: [],
  });

  /** Deferred unmounts, keyed by dialog, so reopening can cancel one mid-flight. */
  const pendingRemovals = new Map<string, ReturnType<typeof setTimeout>>();

  let lastId = 0;

  /** The dialogs to paint, in the order they were opened. */
  const instances = computed(() => state.value.toRender);

  function registerDialog(instance: DialogInstance) {
    const key = `dialog-${++lastId}`;

    // Storing in a `ref` deep-unwraps the instance — `isOpen: Ref<boolean>` goes in and
    // `isOpen: boolean` comes out, and `props` likewise arrives at the renderer already
    // unwrapped. The two types cannot be reconciled statically, so this is the seam:
    // write the raw instance, and read it back through `getDialog` as the unwrapped one.
    state.value.registeredDialogs[key] = instance as unknown as UnwrapRef<DialogInstance>;

    return [key, getDialog(key)!] as const;
  }

  /**
   * Drops a dialog for good. Unlike `removeFromRender` this is immediate: the owner is
   * gone, so there is no close transition left to wait for.
   */
  function unregisterDialog(key: string) {
    cancelPendingRemoval(key);
    dropFromRender(key);

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete state.value.registeredDialogs[key];
  }

  function getDialog(key: string) {
    return state.value.registeredDialogs[key];
  }

  function addToRender(key: string) {
    // A dialog reopened inside the close transition still has an unmount queued against
    // it; without this the timer fires and unmounts the freshly reopened dialog.
    cancelPendingRemoval(key);

    const instance = getDialog(key);

    if (!instance) {
      return;
    }

    // Guard against a second entry under the same key, which would hand the renderer a
    // duplicate `v-for` key and paint the dialog twice.
    if (state.value.toRender.some(i => i.key === key)) {
      return;
    }

    state.value.toRender.push({ key, instance });
  }

  /** Unmounts a dialog once its close transition has had `delay` ms to play. */
  function removeFromRender(key: string, delay = CLOSE_TRANSITION_MS) {
    cancelPendingRemoval(key);

    pendingRemovals.set(key, setTimeout(() => {
      pendingRemovals.delete(key);
      dropFromRender(key);
    }, delay));
  }

  function dropFromRender(key: string) {
    state.value.toRender = state.value.toRender.filter(i => i.key !== key);
  }

  function cancelPendingRemoval(key: string) {
    const pending = pendingRemovals.get(key);

    if (pending !== undefined) {
      clearTimeout(pending);
      pendingRemovals.delete(key);
    }
  }

  return {
    instances,
    registerDialog,
    unregisterDialog,
    addToRender,
    removeFromRender,
    getDialog,
  };
}

export type DialogManager = ReturnType<typeof useDialogManagerInstance>;
