import { noopIdentityLogger } from "../utils/logger";

import { SessionExpiredReasons } from "./types";
import type { SessionExpiredReason, SessionLogger } from "./types";

export interface KeepAliveControllerConfig {
  /** How long the keep-alive dialog stays open before the session expires. */
  countdownMs: number
  /** Keep the countdown deadline this far inside the real token expiry. */
  safetyMarginMs: number
}

export interface KeepAliveControllerDeps {
  now: () => number
  setTimer: (cb: () => void, ms: number) => unknown
  clearTimer: (handle: unknown) => void
  /** Current absolute token expiry (epoch ms), or null if unknown. */
  getExpiryMs: () => number | null
  /** Show the "are you still there?" dialog; receives the absolute deadline. */
  openKeepAliveDialog: (deadlineMs: number) => void
  closeKeepAliveDialog: () => void
  /** Renew the token (user confirmed they're still here). */
  refreshNow: () => Promise<void>
  /** Settle the session as expired and surface the re-login dialog. */
  expireSession: (reason: SessionExpiredReason) => void
  config: KeepAliveControllerConfig
  logger?: SessionLogger
}

/**
 * Orchestrates the "keep me logged in?" flow. When a token renewal falls due
 * while the user is idle, the token lifecycle hands off here instead of silently
 * refreshing: we open a countdown dialog and either renew on confirm or let the
 * session expire (which surfaces the re-login dialog) on timeout.
 *
 * Pure and dependency-injected — the timer, clock, dialogs and session effects
 * are all passed in, so the state machine is unit-tested without a DOM. The
 * dialogs themselves are the consuming app's (e.g. via `@directorkit/dialogs`);
 * this layer holds no paint.
 */
export function createKeepAliveController(deps: KeepAliveControllerDeps) {
  const { now, setTimer, clearTimer, getExpiryMs, config, logger = noopIdentityLogger } = deps;

  let timer: unknown = null;
  let open = false;

  /** Absolute deadline: min(now + countdown, tokenExpiry - safetyMargin). */
  function computeDeadline(): number {
    const base = now() + config.countdownMs;
    const expiry = getExpiryMs();
    if (expiry === null) {
      return base;
    }
    return Math.min(base, expiry - config.safetyMarginMs);
  }

  function stopTimer(): void {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  }

  function closeDialog(): void {
    if (open) {
      deps.closeKeepAliveDialog();
      open = false;
    }
  }

  function expire(reason: SessionExpiredReason): void {
    stopTimer();
    closeDialog();
    logger.warn("Keep-alive lapsed — session expired", { reason });
    deps.expireSession(reason);
  }

  /** Renewal is due but the user is idle: prompt them to stay signed in. */
  function requestKeepAlive(): void {
    if (open) {
      return;
    }

    const deadline = computeDeadline();
    if (deadline <= now()) {
      // No headroom left before the token dies — skip the prompt.
      expire(SessionExpiredReasons.IdleTimeout);
      return;
    }

    open = true;
    deps.openKeepAliveDialog(deadline);
    timer = setTimer(() => {
      timer = null;
      expire(SessionExpiredReasons.IdleTimeout);
    }, deadline - now());
    logger.debug("Keep-alive dialog opened", { deadline });
  }

  /** The user confirmed they're still here (button or activity in the dialog). */
  async function confirm(): Promise<void> {
    if (!open) {
      return;
    }
    stopTimer();
    closeDialog();
    await deps.refreshNow();
  }

  /** The token is already gone (e.g. wake-expired): drop the prompt and expire. */
  function handleExpired(reason: SessionExpiredReason): void {
    expire(reason);
  }

  /** Tear down without expiring (e.g. on logout). */
  function cancel(): void {
    stopTimer();
    closeDialog();
  }

  return {
    requestKeepAlive,
    confirm,
    handleExpired,
    cancel,
    get isOpen() {
      return open;
    },
  };
}
