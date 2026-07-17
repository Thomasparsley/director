import { defineNuxtPlugin } from "#app";

import { useDialogManagerInstance } from "../composables/useDialogManager";

/**
 * One dialog manager per Nuxt app. A module-level singleton would be simpler but would
 * share dialog state across SSR requests; the plugin scopes it to the app instance.
 */
export default defineNuxtPlugin({
  name: "dialogManagerInstance",
  setup: () => {
    const dialogManagerInstance = useDialogManagerInstance();

    return {
      provide: {
        dialogManagerInstance,
      },
    };
  },
});
