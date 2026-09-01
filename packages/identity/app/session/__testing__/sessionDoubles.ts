import { vi } from "vitest";
import { computed, ref } from "vue";

import { createIdentitySession } from "../sessionService";
import type { useSessionStore } from "../store";
import { SessionStatuses } from "../types";
import type { SessionExpiredReason, SessionStatus } from "../types";
import type { IdentityUser } from "../../types/user";

/**
 * Test doubles for the identity state machine, shared by `sessionService.spec.ts`
 * (the flows) and `ssrBootstrap.spec.ts` (the server-render contract). One copy,
 * because two copies of a fake store is how the two suites end up disagreeing about
 * what the real one does.
 *
 * The store double is deliberately *stateful*, not a bag of spies: several
 * assertions turn on what the status actually became, and a spy-only fake would
 * happily report `setAnonymous` being called on a session that was already
 * authenticated.
 */
export const aUser = { name: "a" } as IdentityUser;

export function makeFakeStore() {
  const status = ref<SessionStatus>(SessionStatuses.Anonymous);
  const user = ref<IdentityUser | undefined>(undefined);
  const expiresAtMs = ref<number | null>(null);
  const expiredReason = ref<SessionExpiredReason | null>(null);
  const hasToken = ref(false);
  const hasRefreshToken = ref(false);

  const setAuthenticating = vi.fn(() => {
    status.value = SessionStatuses.Authenticating;
  });
  const setAuthenticated = vi.fn((u: IdentityUser) => {
    user.value = u;
    status.value = SessionStatuses.Authenticated;
  });
  const setAnonymous = vi.fn(() => {
    user.value = undefined;
    status.value = SessionStatuses.Anonymous;
    expiredReason.value = null;
  });
  const setExpired = vi.fn((reason: SessionExpiredReason) => {
    status.value = SessionStatuses.Expired;
    expiredReason.value = reason;
  });
  const applyExpiry = vi.fn((iso: string) => {
    expiresAtMs.value = Date.parse(iso);
  });
  const clearToken = vi.fn(() => {
    expiresAtMs.value = null;
    hasToken.value = false;
    hasRefreshToken.value = false;
  });

  return {
    status,
    user,
    expiresAtMs,
    expiredReason,
    isAuthorized: computed(() => status.value === SessionStatuses.Authenticated),
    hasAccessToken: computed(() => hasToken.value),
    hasRefreshToken: computed(() => hasRefreshToken.value),
    setHasToken: (v: boolean) => {
      hasToken.value = v;
    },
    setHasRefreshToken: (v: boolean) => {
      hasRefreshToken.value = v;
    },
    setAuthenticating,
    setAuthenticated,
    setAnonymous,
    setExpired,
    applyExpiry,
    clearToken,
    reloadCookie: vi.fn(),
  };
}

export function makeFakeApi() {
  return {
    sendLoginRequest: vi.fn(),
    sendRefreshAccessTokenRequest: vi.fn(),
    sendLogoutRequest: vi.fn(),
  };
}

export type FakeStore = ReturnType<typeof makeFakeStore>;
export type FakeApi = ReturnType<typeof makeFakeApi>;

export function makeSession(store: FakeStore, api: FakeApi, fetchUser = vi.fn()) {
  const session = createIdentitySession({
    store: store as unknown as ReturnType<typeof useSessionStore>,
    api: api as unknown as Parameters<typeof createIdentitySession>[0]["api"],
    fetchUser,
  });
  return { session, fetchUser };
}
