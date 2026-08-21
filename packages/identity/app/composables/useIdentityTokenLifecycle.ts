import { useEventListener } from "@vueuse/core";
import { onScopeDispose, watch } from "vue";

import { createTokenLifecycle } from "../session/tokenLifecycle";
import { useSessionStore } from "../session/store";
import type { SessionExpiredReason, SessionRecoveryOutcome } from "../session/types";

import { useIdentityRuntime } from "./useIdentityRuntime";

interface UseIdentityTokenLifecycleOptions {
  /** Renew the token; rejects only on transient failure. */
  refresh: () => Promise<void>
  /** Trade the refresh token for a new access token once the access token is dead. */
  recoverSession: () => Promise<SessionRecoveryOutcome>
  /** How to settle the session when the token is gone/expired and unrenewable. */
  onExpired?: (reason: SessionExpiredReason) => void
  /** Idle gate; when it returns false the keep-alive flow takes over. */
  shouldRenew?: () => boolean
  /** Called when renewal is due but the user is idle (opens keep-alive). */
  onIdleRefreshDue?: () => void
}

const serverNoop = {
  resume: () => {},
  pause: () => {},
  refreshNow: () => Promise.resolve(),
};

/**
 * Production wiring for the token lifecycle: builds `createTokenLifecycle` from
 * the session store and browser wake signals. Timers are suspended in
 * background tabs and during sleep, so we re-evaluate on visibility/focus/online
 * and re-arm whenever the stored expiry changes.
 */
export function useIdentityTokenLifecycle(options: UseIdentityTokenLifecycleOptions) {
  if (import.meta.server) {
    return serverNoop;
  }

  const runtime = useIdentityRuntime();
  const store = useSessionStore();
  const logger = runtime.logger("Identity:TokenLifecycle");

  const lifecycle = createTokenLifecycle({
    now: () => Date.now(),
    setTimer: (cb, ms) => setTimeout(cb, ms),
    clearTimer: h => clearTimeout(h as ReturnType<typeof setTimeout>),
    sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
    getExpiryMs: () => store.expiresAtMs.value,
    hasToken: () => store.hasAccessToken.value,
    reloadCookie: () => store.reloadCookie(),
    refresh: options.refresh,
    canRecoverSession: () => store.hasRefreshToken.value,
    recoverSession: options.recoverSession,
    onExpired: options.onExpired ?? defaultOnExpired,
    shouldRenew: options.shouldRenew,
    onIdleRefreshDue: options.onIdleRefreshDue,
    config: {
      leadMs: runtime.timing.refreshLeadMs,
      minDelayMs: runtime.timing.refreshMinDelayMs,
      maxRetries: runtime.timing.refreshMaxRetries,
      retryBaseMs: runtime.timing.refreshRetryBaseMs,
    },
    logger,
  });

  // Default settle: fully log out locally. An app-mounted keep-alive component
  // replaces this with the `expired` state + keep-alive/re-login dialog.
  function defaultOnExpired(): void {
    store.clearToken();
    store.setAnonymous();
  }

  // Every way a suspended tab can come back. On a phone, hiding the browser and
  // reopening it minutes later fires `visibilitychange` (and `pageshow` when the page
  // comes back from the bfcache) — that is the moment to re-check the token instead
  // of trusting a timer that never ran.
  useEventListener(document, "visibilitychange", () => {
    if (document.visibilityState === "visible") {
      lifecycle.resync();
    }
  });
  useEventListener(window, "focus", () => lifecycle.resync());
  useEventListener(window, "online", () => lifecycle.resync());
  useEventListener(window, "pageshow", () => lifecycle.resync());

  // Re-arm when login/refresh writes a new expiry.
  watch(() => store.expiresAtMs.value, () => lifecycle.reschedule());

  onScopeDispose(() => lifecycle.pause());

  return {
    resume: lifecycle.resume,
    pause: lifecycle.pause,
    refreshNow: lifecycle.refreshNow,
  };
}
