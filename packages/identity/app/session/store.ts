import type { Ref } from "vue";
import { computed } from "vue";

import { refreshCookie, useCookie, useNuxtApp, useState } from "#app";

import { parseBooleanCookie } from "../core/cookieValue";
import { parseExpiry } from "../core/tokenTiming";
import { useIdentityRuntime } from "../composables/useIdentityRuntime";
import type { IdentityUser } from "../types/user";

import type { SessionExpiredReason, SessionState } from "./types";

const SESSION_STATE_KEY = "identity-session";
// Stashed on the (per-request) Nuxt app so every caller shares ONE cookie ref.
// Two independent `useCookie(...)` refs do not sync, so a clear in one instance
// left another reporting the old value (bug B4 upstream). Memoising per Nuxt app
// keeps the ref shared within a request and isolated across SSR requests.
const COOKIE_REF_KEY = "$__identityAccessTokenCookie";
const REFRESH_COOKIE_REF_KEY = "$__identityRefreshTokenCookie";

function useSharedCookie(name: string, memoKey: string): Ref<string | undefined> {
  const nuxtApp = useNuxtApp() as unknown as Record<string, unknown>;
  const existing = nuxtApp[memoKey] as Ref<string | undefined> | undefined;
  if (existing) {
    return existing;
  }

  // Default must be `undefined`, not "false": a string default would be
  // serialized into the Nuxt payload and override the real cookie written by
  // the login endpoint, so the auth state would never be picked up on hydration.
  const cookie = useCookie<string | undefined>(name, {
    default: () => undefined,
  });
  nuxtApp[memoKey] = cookie;
  return cookie;
}

function initialState(): SessionState {
  return {
    status: "unknown",
    user: undefined,
    expiresAtMs: null,
    expiredReason: null,
  };
}

/**
 * The single owner of client identity state: the state-machine fields (status,
 * user, expiry) live in one keyed `useState`, and the JS-readable marker
 * cookies live in one shared ref each. Every other identity composable is a
 * thin view over this store, so there is exactly one writer of session state.
 */
export function useSessionStore() {
  const { cookieNames } = useIdentityRuntime();
  const state = useState<SessionState>(SESSION_STATE_KEY, initialState);
  const cookie = useSharedCookie(cookieNames.hasAccessToken, COOKIE_REF_KEY);
  const refreshCookieRef = useSharedCookie(cookieNames.hasRefreshToken, REFRESH_COOKIE_REF_KEY);

  const status = computed(() => state.value.status);
  const user = computed(() => state.value.user);
  const isAuthorized = computed(() => state.value.status === "authenticated");
  const expiresAtMs = computed(() => state.value.expiresAtMs);
  const expiredReason = computed(() => state.value.expiredReason);
  const hasAccessToken = computed(() => parseBooleanCookie(cookie.value));
  const hasRefreshToken = computed(() => parseBooleanCookie(refreshCookieRef.value));

  function setAuthenticating(): void {
    state.value.status = "authenticating";
  }

  function setAuthenticated(nextUser: IdentityUser): void {
    state.value.user = nextUser;
    state.value.status = "authenticated";
    state.value.expiredReason = null;
  }

  function setAnonymous(): void {
    state.value.user = undefined;
    state.value.status = "anonymous";
    state.value.expiredReason = null;
  }

  function setExpired(reason: SessionExpiredReason): void {
    state.value.status = "expired";
    state.value.expiredReason = reason;
  }

  /** Records the new token expiry and re-reads the cookies the server just set. */
  function applyExpiry(refreshAfter: string): void {
    reloadCookie();
    state.value.expiresAtMs = parseExpiry(refreshAfter);
  }

  /**
   * Forgets the local tokens (cookies + expiry); does not touch user/status. Clears the refresh
   * marker too: every caller reaches here once the session is dead server-side — either the server
   * killed it (logout, a rejected refresh) or we just asked it to (the idle keep-alive lapse
   * revokes before clearing). Leaving the marker set would make startup recovery retry a token
   * that cannot work; clearing it while the server session is still alive would throw away a
   * recoverable session, so callers must revoke first.
   */
  function clearToken(): void {
    cookie.value = undefined;
    refreshCookieRef.value = undefined;
    state.value.expiresAtMs = null;
  }

  function reloadCookie(): void {
    refreshCookie(cookieNames.hasAccessToken);
    refreshCookie(cookieNames.hasRefreshToken);
  }

  return {
    status,
    user,
    isAuthorized,
    expiresAtMs,
    expiredReason,
    hasAccessToken,
    hasRefreshToken,
    setAuthenticating,
    setAuthenticated,
    setAnonymous,
    setExpired,
    applyExpiry,
    clearToken,
    reloadCookie,
  };
}
