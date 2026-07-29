import { useIdle } from "@vueuse/core";
import { ref } from "vue";

import { useIdentityRuntime } from "./useIdentityRuntime";

/**
 * Tracks whether the user has gone idle (no pointer / keyboard / touch / scroll
 * activity) for longer than `timing.idleAfterMs`. The token lifecycle reads this
 * to decide between a silent renewal (active) and the keep-alive prompt (idle).
 * Server-side there is no user, so it reports "not idle".
 */
export function useIdentityActivity() {
  if (import.meta.server) {
    return { isIdle: ref(false) };
  }

  const runtime = useIdentityRuntime();
  const { idle } = useIdle(runtime.timing.idleAfterMs);
  return { isIdle: idle };
}
