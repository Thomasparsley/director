import type { Ref } from "vue";
import { watch } from "vue";

import { useNuxtApp } from "#app";

import { createAuthRecovery } from "../session/authRecovery";
import { useSessionStore } from "../session/store";
import type { SessionExpiredReason } from "../session/types";

import { useIdentityAuthentication } from "./useIdentityAuthentication";
import { useIdentityPermissions } from "./useIdentityPermissions";
import { useIdentityTokenLifecycle } from "./useIdentityTokenLifecycle";

export type IdentityInstance = ReturnType<typeof useIdentityInstance>;

/**
 * Retrieves the singleton identity instance registered by the plugin.
 */
export function useIdentity(): IdentityInstance {
  const { $identityInstance } = useNuxtApp() as { $identityInstance?: IdentityInstance };
  if (!$identityInstance) {
    throw new Error(
      "Identity instance not found. Configure `identity` in app.config (at minimum "
      + "`identity.api`) so the identity plugin can boot.",
    );
  }
  return $identityInstance;
}

/**
 * Composes the identity instance from focused sub-composables.
 * The plugin calls this once and shares the result via `$identityInstance`.
 */
export function useIdentityInstance() {
  const sessionStore = useSessionStore();
  const { isAuthorized, user } = sessionStore;
  const auth = useIdentityAuthentication();

  // Late-bindable keep-alive seam. The token lifecycle is created here (plugin
  // scope, before any component mounts), but the keep-alive orchestration lives
  // in an app-mounted component (which has dialog context). These handlers let
  // that component take over idle-gating and expiry once it mounts; until then,
  // idle never blocks renewal and an expired session simply logs out.
  let isIdleGetter: () => boolean = () => false;
  let idleRefreshDueHandler: () => void = () => {};
  let expiredHandler: (reason: SessionExpiredReason) => void = () => {
    sessionStore.clearToken();
    sessionStore.setAnonymous();
  };
  // Returns whether the session was restored (true) or the user gave up (false).
  // Default (no keep-alive component, e.g. SSR) declines — no dialog.
  let promptReloginHandler: (reason: SessionExpiredReason) => Promise<boolean> = () => Promise.resolve(false);

  const tokenLifecycle = useIdentityTokenLifecycle({
    refresh: auth.refreshAccessToken,
    shouldRenew: () => !isIdleGetter(),
    onIdleRefreshDue: () => idleRefreshDueHandler(),
    onExpired: reason => expiredHandler(reason),
  });

  const permissions = useIdentityPermissions(user, isAuthorized);

  const keepAlive = {
    expiresAtMs: sessionStore.expiresAtMs,
    refreshSession: () => tokenLifecycle.refreshNow(),
    /**
     * Settle the session as expired (kept user, dropped authorization). Authorization
     * drops first so the UI and the token lifecycle react immediately; an idle lapse
     * then revokes server-side before the local tokens go, because that is the one
     * expiry reason whose session is still alive at the backend.
     */
    expireSession: async (reason: SessionExpiredReason) => {
      sessionStore.setExpired(reason);
      if (reason === "idle-timeout") {
        await auth.revokeSession();
      }
      sessionStore.clearToken();
    },
    setIdleSource: (source: Ref<boolean>) => {
      isIdleGetter = () => source.value;
    },
    setIdleRefreshDueHandler: (fn: () => void) => {
      idleRefreshDueHandler = fn;
    },
    setExpiredHandler: (fn: (reason: SessionExpiredReason) => void) => {
      expiredHandler = fn;
    },
    setPromptReloginHandler: (fn: (reason: SessionExpiredReason) => Promise<boolean>) => {
      promptReloginHandler = fn;
    },
  };

  // Transport-level auth recovery: the app wires `recoverAuth` into its data layer's
  // auth-error hook (e.g. a 401 interceptor or a GraphQL auth exchange). See
  // createAuthRecovery for the full contract.
  const { recoverAuth } = createAuthRecovery({
    getStatus: () => sessionStore.status.value,
    isAuthorized: () => isAuthorized.value,
    refresh: () => tokenLifecycle.refreshNow(),
    promptRelogin: () => promptReloginHandler("auth-error"),
  });

  if (import.meta.client) {
    watch(
      isAuthorized,
      (authorized) => {
        if (authorized) {
          tokenLifecycle.resume();
        }
        else {
          tokenLifecycle.pause();
        }
      }, {
        immediate: true,
      });
  }

  return {
    user,
    isAuthorized,
    hasUserFullAccess: permissions.hasUserFullAccess,
    login: auth.login,
    logout: auth.logout,
    hasUserPermission: permissions.hasUserPermission,
    useHasUserPermission: permissions.useHasUserPermission,
    fetchMe: auth.fetchMe,
    refetchMe: auth.refetchMe,
    sessionStatus: auth.status,
    bootstrap: auth.bootstrap,
    whenSettled: auth.whenSettled,
    recoverAuth,
    /** Internal seam for an app-mounted keep-alive component; not part of the public API. */
    _keepAlive: keepAlive,
  };
}
