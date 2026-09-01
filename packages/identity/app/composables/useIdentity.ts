import type { Ref } from "vue";
import { computed, watch } from "vue";

import { useNuxtApp } from "#app";

import { IdentityInstanceMissingError } from "../errors/identityError";
import { createAuthRecovery } from "../session/authRecovery";
import { useSessionStore } from "../session/store";
import { SessionExpiredReasons, SessionStatuses } from "../session/types";
import type { SessionExpiredReason } from "../session/types";

import { useIdentityAuthentication } from "./useIdentityAuthentication";
import { useIdentityPermissions } from "./useIdentityPermissions";
import { useIdentityTokenLifecycle } from "./useIdentityTokenLifecycle";

export type IdentityInstance = ReturnType<typeof useIdentityInstance>;

/**
 * Retrieves the singleton identity instance registered by the plugin.
 *
 * This is what app code calls, however often it likes: it is a property read off
 * the Nuxt app, with no state of its own. The machinery — watches, wake listeners,
 * the token-refresh timer — is built once by `useIdentityInstance()` below, which
 * only the plugin calls.
 */
export function useIdentity(): IdentityInstance {
  const { $identityInstance } = useNuxtApp() as { $identityInstance?: IdentityInstance };
  if (!$identityInstance) {
    throw new IdentityInstanceMissingError();
  }
  return $identityInstance;
}

/**
 * Composes the identity instance from focused sub-composables.
 *
 * **Call this once per Nuxt app — the plugin does, and shares the result via
 * `$identityInstance`. App code wants `useIdentity()` instead.**
 *
 * It is not a getter: each call builds a fresh token lifecycle (a refresh timer plus
 * the wake listeners on `document`/`window`) and a watch that resumes that timer
 * immediately. None of it is inside a component scope, so `onScopeDispose` never
 * runs and a second instance would not merely duplicate the refresh loop — it would
 * keep duplicating it for the life of the page.
 *
 * The dev guard below turns that from a rule someone has to remember into one they
 * get told about.
 */
export function useIdentityInstance() {
  if (import.meta.dev && (useNuxtApp() as { $identityInstance?: unknown }).$identityInstance) {
    console.warn(
      "[identity] useIdentityInstance() was called on an app that already has one. "
      + "Every call builds another refresh timer and another set of wake listeners, "
      + "and nothing disposes them. Use useIdentity() to read the existing instance.",
    );
  }

  const sessionStore = useSessionStore();
  const { isAuthorized, user } = sessionStore;
  const auth = useIdentityAuthentication();

  // `isAuthorized` answers "is this a logged-in user?" — and answers `false` for BOTH
  // "no" and "not known yet". Chrome that renders a logged-out state must not take
  // that `false` at face value: an access token typically dies in minutes while the
  // refresh cookie lives for days, so the very common "came back to the site after a
  // break" request is server-rendered with the session still `unknown`, and a header
  // that trusted `isAuthorized` paints "Sign in" at a user who was logged in the
  // whole time. Branch on three states, not two, and hold a neutral placeholder in
  // the avatar's own footprint until this turns true.
  const isSessionSettled = computed(() => sessionStore.status.value !== SessionStatuses.Unknown);

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
    recoverSession: auth.recoverFromRefreshToken,
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
      if (reason === SessionExpiredReasons.IdleTimeout) {
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
    promptRelogin: () => promptReloginHandler(SessionExpiredReasons.AuthError),
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

  // Three questions, three groups — instead of one flat surface where the answer to
  // "who is this?" sat next to the machinery that worked it out.
  //
  // The grouping also lets the members drop the prefixes a flat namespace forced on
  // them: `hasUserFullAccess` is `permissions.hasFullAccess` and `sessionStatus` is
  // `session.status`, because the group now carries the part the name used to repeat.
  //
  // Call sites destructure out of a group — `useIdentity().permissions` — rather than
  // holding the group object, because in a component they must: Vue unwraps only
  // top-level refs from `<script setup>`, so a `permissions.hasFullAccess` reaching a
  // template would render the ref rather than the boolean. Every member is therefore
  // named to stand on its own once destructured.
  return {
    /** Who is asking. */
    viewer: {
      user,
      isAuthorized,
      isSessionSettled,
    },

    /**
     * What they are allowed to do. `useIdentityPermissions` names its members for
     * this seat, so it *is* the group rather than being copied into one.
     */
    permissions,

    /**
     * How the answer to "who is asking" is reached and kept — the state machine, not
     * the state. Plugins, route guards and the keep-alive component use this; a
     * component rendering a name or a permission should not have to.
     */
    session: {
      status: auth.status,
      expiredReason: sessionStore.expiredReason,
      isSettled: isSessionSettled,
      bootstrap: auth.bootstrap,
      whenSettled: auth.whenSettled,
      fetchMe: auth.fetchMe,
      refetchMe: auth.refetchMe,
      recoverAuth,
      /** Internal seam behind `useIdentityKeepAlive()`; not part of the public API. */
      _keepAlive: keepAlive,
    },

    // Deliberately not inside `session`: these two are the verbs a *person* performs,
    // and `identity.login(...)` is what that reads like. Everything in `session`
    // above happens to them rather than by them.
    login: auth.login,
    logout: auth.logout,
  };
}
