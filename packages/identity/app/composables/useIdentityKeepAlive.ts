import { onScopeDispose, watch } from "vue";

import { createKeepAliveController } from "../session/keepAliveController";
import type { SessionExpiredReason } from "../session/types";

import { useIdentity } from "./useIdentity";
import { useIdentityActivity } from "./useIdentityActivity";
import { useIdentityRuntime } from "./useIdentityRuntime";

export interface UseIdentityKeepAliveOptions {
  /**
   * Open the "are you still there?" dialog. Receives the absolute deadline (epoch ms)
   * the countdown runs to — already clamped inside the real token expiry, so a
   * countdown rendered from it can never promise time the token does not have.
   */
  openDialog: (deadlineMs: number) => void
  /** Close it again (confirmed, expired, or torn down). */
  closeDialog: () => void
  /**
   * Surface the re-login dialog after a transport auth error, resolving `true` once the
   * user is signed back in and `false` if they gave up. Optional: without it, auth
   * recovery that cannot self-heal simply leaves the session `expired`.
   */
  promptRelogin?: (reason: SessionExpiredReason) => Promise<boolean>
}

const serverNoop = {
  confirm: () => Promise.resolve(),
  cancel: () => {},
};

/**
 * Wires the keep-alive controller into the identity instance — the counterpart of
 * `useIdentityTokenLifecycle`, for the half of the session that needs a dialog.
 *
 * Call it once from an app-mounted component (one that has your dialog context) and
 * give it the two paint callbacks. It takes over idle-gating from there: while the
 * user is active the token renews silently, and once they have gone idle a due renewal
 * opens your dialog instead, renewing on `confirm()` or expiring the session when the
 * countdown runs out. Timing comes from `identity.timing` in app.config
 * (`keepAliveCountdownMs`, `keepAliveSafetyMarginMs`, `idleAfterMs`).
 */
export function useIdentityKeepAlive(options: UseIdentityKeepAliveOptions) {
  if (import.meta.server) {
    return serverNoop;
  }

  const runtime = useIdentityRuntime();
  const identity = useIdentity();
  const keepAlive = identity.session._keepAlive;
  const { isIdle } = useIdentityActivity();

  const controller = createKeepAliveController({
    now: () => Date.now(),
    setTimer: (cb, ms) => setTimeout(cb, ms),
    clearTimer: h => clearTimeout(h as ReturnType<typeof setTimeout>),
    getExpiryMs: () => keepAlive.expiresAtMs.value,
    openKeepAliveDialog: options.openDialog,
    closeKeepAliveDialog: options.closeDialog,
    refreshNow: () => keepAlive.refreshSession(),
    expireSession: reason => keepAlive.expireSession(reason),
    config: {
      countdownMs: runtime.timing.keepAliveCountdownMs,
      safetyMarginMs: runtime.timing.keepAliveSafetyMarginMs,
    },
    logger: runtime.logger("Identity:KeepAlive"),
  });

  // Take over the seams the identity instance left late-bindable: from here on, idle
  // blocks silent renewal and an expiry runs through the dialog rather than a bare
  // local logout.
  keepAlive.setIdleSource(isIdle);
  keepAlive.setIdleRefreshDueHandler(() => controller.requestKeepAlive());
  keepAlive.setExpiredHandler(reason => controller.handleExpired(reason));
  if (options.promptRelogin) {
    keepAlive.setPromptReloginHandler(options.promptRelogin);
  }

  // Authorization can also drop from outside the countdown — a deliberate logout, a
  // rejected refresh. Tear the dialog down rather than leaving it counting toward an
  // expiry for a session that is already gone. (An expiry the controller drove itself
  // has closed the dialog before it gets here, so this is a no-op for that path.)
  watch(identity.viewer.isAuthorized, (authorized) => {
    if (!authorized) {
      controller.cancel();
    }
  });

  onScopeDispose(() => controller.cancel());

  return {
    /** The user said they are still here: renew and close. */
    confirm: () => controller.confirm(),
    /** Tear the dialog down without expiring (e.g. the user logged out deliberately). */
    cancel: () => controller.cancel(),
  };
}
