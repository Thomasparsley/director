import {
  computeRefreshDelayMs,
  isTokenExpired,
  isWithinRefreshWindow,
} from "../core/tokenTiming";
import { noopIdentityLogger } from "../utils/logger";

import type { SessionExpiredReason, SessionLogger } from "./types";

export interface TokenLifecycleConfig {
  /** Renew this many ms before expiry. */
  leadMs: number
  /** Floor for a scheduled refresh delay. */
  minDelayMs: number
  /** Attempts for one refresh before giving up on a transient failure. */
  maxRetries: number
  /** Base delay for exponential backoff between refresh retries. */
  retryBaseMs: number
}

export interface TokenLifecycleDeps {
  now: () => number
  setTimer: (cb: () => void, ms: number) => unknown
  clearTimer: (handle: unknown) => void
  /** Awaitable delay used for retry backoff (injected for deterministic tests). */
  sleep: (ms: number) => Promise<void>
  /** Current absolute token expiry (epoch ms), or null if unknown. */
  getExpiryMs: () => number | null
  /** Whether a token cookie is currently present. */
  hasToken: () => boolean
  /** Re-read the token cookie from the browser (catches server-deleted cookies). */
  reloadCookie: () => void
  /** Renew the token. Resolves on success; rejects only on transient failure. */
  refresh: () => Promise<void>
  /** The session is unrecoverable (token gone/expired and cannot be renewed). */
  onExpired: (reason: SessionExpiredReason) => void
  /** Gate for automatic renewal (false ⇒ user idle; keep-alive takes over). */
  shouldRenew?: () => boolean
  /** Called instead of auto-refresh when a renewal is due but the user is idle. */
  onIdleRefreshDue?: () => void
  config: TokenLifecycleConfig
  logger?: SessionLogger
}

/**
 * Schedules access-token renewal by absolute expiry instead of polling.
 *
 * A single timer is armed for `expiry - leadMs`; there is no interval, so it
 * cannot "tick late" in a throttled background tab. Because a timer is
 * suspended while the tab/machine sleeps, `resync()` must be called on wake
 * (visibility/focus/online) to re-evaluate against the real clock: if the token
 * has already expired it reports `expired`; if renewal is due it refreshes now;
 * otherwise it re-arms from absolute time. This is the core fix for "left the
 * tab open / laptop asleep for an hour and came back logged-out-but-broken".
 */
export function createTokenLifecycle(deps: TokenLifecycleDeps) {
  const {
    now,
    setTimer,
    clearTimer,
    sleep,
    getExpiryMs,
    hasToken,
    reloadCookie,
    refresh,
    onExpired,
    config,
    logger = noopIdentityLogger,
  } = deps;
  const shouldRenew = deps.shouldRenew ?? (() => true);
  const onIdleRefreshDue = deps.onIdleRefreshDue ?? (() => {});

  let timer: unknown = null;
  let active = false;
  let inFlight: Promise<void> | null = null;

  function stopTimer(): void {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  }

  function schedule(): void {
    stopTimer();
    if (!active || !hasToken()) {
      return;
    }

    const expiry = getExpiryMs();
    const delay = expiry === null
      // Expiry unknown (e.g. just after a reload) — refresh soon to learn it.
      ? config.minDelayMs
      : computeRefreshDelayMs(expiry, now(), {
        leadMs: config.leadMs,
        minDelayMs: config.minDelayMs,
      });

    logger.debug("Scheduling token refresh", { delayMs: delay });
    timer = setTimer(onTimerDue, delay);
  }

  function onTimerDue(): void {
    timer = null;
    if (!active || !hasToken()) {
      return;
    }
    if (!shouldRenew()) {
      logger.debug("Renewal due but user idle — deferring to keep-alive");
      onIdleRefreshDue();
      return;
    }
    void doRefresh();
  }

  async function refreshWithRetry(): Promise<void> {
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        await refresh();
        return;
      }
      catch (error) {
        if (attempt === config.maxRetries) {
          logger.error("Access token refresh failed after all retries", { error, attempts: config.maxRetries });
          return;
        }
        const delay = config.retryBaseMs * 2 ** (attempt - 1);
        logger.warn(`Access token refresh failed, retrying in ${delay}ms`, { error, attempt });
        await sleep(delay);
      }
    }
  }

  function doRefresh(): Promise<void> {
    // Single-flight: coalesce concurrent triggers (timer + a wake event) so we
    // never fire two overlapping refreshes.
    inFlight ??= refreshWithRetry().finally(() => {
      inFlight = null;
    });
    return inFlight.then(() => {
      if (active) {
        schedule();
      }
    });
  }

  /** Re-evaluate against the real clock; call on tab wake. */
  function resync(): void {
    if (!active) {
      return;
    }

    // A backgrounded browser can silently drop the (expiring) cookie — re-read
    // it so we don't keep showing "logged in" over a token that is gone (B3).
    reloadCookie();
    if (!hasToken()) {
      logger.warn("Access token cookie gone on wake — session expired");
      stopTimer();
      onExpired("wake-expired");
      return;
    }

    const expiry = getExpiryMs();
    if (expiry !== null && isTokenExpired(expiry, now())) {
      logger.warn("Access token already expired on wake");
      stopTimer();
      onExpired("wake-expired");
      return;
    }

    const dueNow = expiry === null || isWithinRefreshWindow(expiry, now(), config.leadMs);
    if (!dueNow) {
      // Timers drift while suspended — always re-arm from absolute time.
      schedule();
      return;
    }

    if (!shouldRenew()) {
      onIdleRefreshDue();
      return;
    }
    void doRefresh();
  }

  /** Force a refresh now, bypassing the idle gate (e.g. keep-alive confirm). */
  function refreshNow(): Promise<void> {
    return doRefresh();
  }

  /** Re-arm the timer for the current expiry (call when the expiry changes). */
  function reschedule(): void {
    schedule();
  }

  function resume(): void {
    active = true;
    schedule();
  }

  function pause(): void {
    active = false;
    stopTimer();
  }

  return {
    resume,
    pause,
    resync,
    refreshNow,
    reschedule,
    get isActive() {
      return active;
    },
  };
}
