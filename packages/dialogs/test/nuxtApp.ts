import type { DialogManager } from "../app/composables/useDialogManager";

/**
 * Stands in for `#app` under bare Vitest, which has no Nuxt app and so no plugin to
 * provide the manager. A spec calls `setTestDialogManager` with the manager it wants
 * `useDialogManager` to hand back, so it can assert against the same object the code
 * under test is driving.
 */
let manager: DialogManager | undefined;

export function setTestDialogManager(value: DialogManager | undefined) {
  manager = value;
}

export function useNuxtApp() {
  if (!manager) {
    throw new Error("No dialog manager set for this test — call setTestDialogManager first.");
  }

  return { $dialogManagerInstance: manager };
}
