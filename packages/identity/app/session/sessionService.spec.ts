import { describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";

import { LoginErrorResults, RefreshErrorResults } from "../errors/identityApiErrors";
import type { IdentityUser } from "../types/user";

import { createIdentitySession } from "./sessionService";
import type { useSessionStore } from "./store";

const aUser = { name: "a" } as IdentityUser;

function makeFakeStore() {
  const status = ref<string>("anonymous");
  const user = ref<IdentityUser | undefined>(undefined);
  const expiresAtMs = ref<number | null>(null);
  const expiredReason = ref<string | null>(null);
  const hasToken = ref(false);
  const hasRefreshToken = ref(false);

  const setAuthenticating = vi.fn(() => {
    status.value = "authenticating";
  });
  const setAuthenticated = vi.fn((u: IdentityUser) => {
    user.value = u;
    status.value = "authenticated";
  });
  const setAnonymous = vi.fn(() => {
    user.value = undefined;
    status.value = "anonymous";
    expiredReason.value = null;
  });
  const setExpired = vi.fn((reason: string) => {
    status.value = "expired";
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
    isAuthorized: computed(() => status.value === "authenticated"),
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

function makeFakeApi() {
  return {
    sendLoginRequest: vi.fn(),
    sendRefreshAccessTokenRequest: vi.fn(),
    sendLogoutRequest: vi.fn(),
  };
}

type FakeStore = ReturnType<typeof makeFakeStore>;
type FakeApi = ReturnType<typeof makeFakeApi>;

function makeSession(store: FakeStore, api: FakeApi, fetchUser = vi.fn()) {
  const session = createIdentitySession({
    store: store as unknown as ReturnType<typeof useSessionStore>,
    api: api as unknown as Parameters<typeof createIdentitySession>[0]["api"],
    fetchUser,
  });
  return { session, fetchUser };
}

describe("createIdentitySession - login", () => {
  it("short-circuits when already authorized", async () => {
    const store = makeFakeStore();
    store.setAuthenticated(aUser);
    const api = makeFakeApi();
    const { session } = makeSession(store, api);

    const result = await session.login({ username: "u", password: "p" });

    expect(result).toEqual({ success: true, value: { status: "ALREADY_AUTHORIZED" } });
    expect(api.sendLoginRequest).not.toHaveBeenCalled();
    // Clearing here would strand the live session with no marker cookie: renewal
    // would stop and the next wake resync would report a bogus expiry.
    expect(store.clearToken).not.toHaveBeenCalled();
  });

  it("drops a stale token before authenticating", async () => {
    const store = makeFakeStore();
    const api = makeFakeApi();
    api.sendLoginRequest.mockResolvedValue({
      success: true,
      value: { status: "OK", refreshAfter: "2030-01-01T00:00:00.000Z" },
    });
    const fetchUser = vi.fn().mockResolvedValue({ success: true, value: aUser });
    const { session } = makeSession(store, api, fetchUser);

    await session.login({ username: "u", password: "p" });

    expect(store.clearToken).toHaveBeenCalled();
    expect(store.isAuthorized.value).toBe(true);
  });

  it("applies the token and loads the user on success", async () => {
    const store = makeFakeStore();
    const api = makeFakeApi();
    api.sendLoginRequest.mockResolvedValue({
      success: true,
      value: { status: "OK", refreshAfter: "2030-01-01T00:00:00.000Z" },
    });
    const fetchUser = vi.fn().mockResolvedValue({ success: true, value: aUser });
    const { session } = makeSession(store, api, fetchUser);

    const result = await session.login({ username: "u", password: "p" });

    expect(result).toEqual({ success: true, value: { status: "OK" } });
    expect(store.applyExpiry).toHaveBeenCalledWith("2030-01-01T00:00:00.000Z");
    expect(store.setAuthenticated).toHaveBeenCalledWith(aUser);
    expect(store.isAuthorized.value).toBe(true);
  });

  it("returns MFA_REQUIRED without applying a token", async () => {
    const store = makeFakeStore();
    const api = makeFakeApi();
    api.sendLoginRequest.mockResolvedValue({
      success: true,
      value: { status: "MFA_REQUIRED", challengeId: "c1", mfaType: "TOTP" },
    });
    const { session } = makeSession(store, api);

    const result = await session.login({ username: "u", password: "p" });

    expect(result).toEqual({
      success: true,
      value: { status: "MFA_REQUIRED", challengeId: "c1", mfaType: "TOTP" },
    });
    expect(store.applyExpiry).not.toHaveBeenCalled();
    expect(store.isAuthorized.value).toBe(false);
  });

  it("returns to anonymous when credentials are rejected", async () => {
    const store = makeFakeStore();
    const api = makeFakeApi();
    api.sendLoginRequest.mockResolvedValue({ success: false, error: LoginErrorResults.InvalidCredentials });
    const { session } = makeSession(store, api);

    const result = await session.login({ username: "u", password: "p" });

    expect(result).toEqual({ success: false, error: LoginErrorResults.InvalidCredentials });
    expect(store.setAnonymous).toHaveBeenCalled();
  });

  it("returns to anonymous when the user fetch fails after token issue", async () => {
    const store = makeFakeStore();
    const api = makeFakeApi();
    api.sendLoginRequest.mockResolvedValue({
      success: true,
      value: { status: "OK", refreshAfter: "2030-01-01T00:00:00.000Z" },
    });
    const fetchUser = vi.fn().mockResolvedValue({ success: false, error: LoginErrorResults.FailedToFetchMe });
    const { session } = makeSession(store, api, fetchUser);

    const result = await session.login({ username: "u", password: "p" });

    expect(result).toEqual({ success: false, error: LoginErrorResults.FailedToFetchMe });
    expect(store.setAnonymous).toHaveBeenCalled();
    expect(store.isAuthorized.value).toBe(false);
  });
});

describe("createIdentitySession - re-login from an expired session", () => {
  function makeExpiredStore() {
    const store = makeFakeStore();
    store.setAuthenticated(aUser);
    store.setExpired("idle-timeout");
    return store;
  }

  it("stays expired — keeping the user — when the password is wrong", async () => {
    const store = makeExpiredStore();
    const api = makeFakeApi();
    api.sendLoginRequest.mockResolvedValue({ success: false, error: LoginErrorResults.InvalidCredentials });
    const { session } = makeSession(store, api);

    await session.login({ username: "u", password: "typo" });

    // Collapsing to anonymous would close the re-login dialog and lose the prefill
    // over a single typo.
    expect(store.status.value).toBe("expired");
    expect(store.expiredReason.value).toBe("idle-timeout");
    expect(store.user.value).toEqual(aUser);
    expect(store.setAnonymous).not.toHaveBeenCalled();
  });

  it("stays expired while the MFA step is outstanding", async () => {
    const store = makeExpiredStore();
    const api = makeFakeApi();
    api.sendLoginRequest.mockResolvedValue({
      success: true,
      value: { status: "MFA_REQUIRED", challengeId: "c1", mfaType: "TOTP" },
    });
    const { session } = makeSession(store, api);

    await session.login({ username: "u", password: "p" });

    expect(store.status.value).toBe("expired");
    expect(store.setAnonymous).not.toHaveBeenCalled();
  });

  it("settles anonymous from a plain anonymous attempt", async () => {
    const store = makeFakeStore();
    const api = makeFakeApi();
    api.sendLoginRequest.mockResolvedValue({ success: false, error: LoginErrorResults.InvalidCredentials });
    const { session } = makeSession(store, api);

    await session.login({ username: "u", password: "typo" });

    expect(store.setAnonymous).toHaveBeenCalled();
    expect(store.setExpired).not.toHaveBeenCalled();
  });
});

describe("createIdentitySession - revokeSession", () => {
  it("ends the session server-side without touching local state", async () => {
    const store = makeFakeStore();
    store.setAuthenticated(aUser);
    const api = makeFakeApi();
    api.sendLogoutRequest.mockResolvedValue(undefined);
    const { session } = makeSession(store, api);

    await session.revokeSession();

    expect(api.sendLogoutRequest).toHaveBeenCalledOnce();
    // The caller (the keep-alive lapse) owns the local transition.
    expect(store.clearToken).not.toHaveBeenCalled();
    expect(store.setAnonymous).not.toHaveBeenCalled();
  });

  it("resolves even when the revoke call fails", async () => {
    const store = makeFakeStore();
    const api = makeFakeApi();
    api.sendLogoutRequest.mockRejectedValue(new Error("offline"));
    const { session } = makeSession(store, api);

    await expect(session.revokeSession()).resolves.toBeUndefined();
  });
});

describe("createIdentitySession - refreshAccessToken", () => {
  it("applies the new expiry on success", async () => {
    const store = makeFakeStore();
    const api = makeFakeApi();
    api.sendRefreshAccessTokenRequest.mockResolvedValue({
      success: true,
      value: { refreshAfter: "2030-01-01T00:00:00.000Z" },
    });
    const { session } = makeSession(store, api);

    await session.refreshAccessToken();

    expect(store.applyExpiry).toHaveBeenCalledWith("2030-01-01T00:00:00.000Z");
  });

  it("expires the session (keeping the user) when the refresh is unauthorized", async () => {
    const store = makeFakeStore();
    store.setAuthenticated(aUser);
    const api = makeFakeApi();
    api.sendRefreshAccessTokenRequest.mockResolvedValue({ success: false, error: RefreshErrorResults.Unauthorized });
    const { session } = makeSession(store, api);

    await session.refreshAccessToken();

    expect(store.clearToken).toHaveBeenCalled();
    expect(store.setExpired).toHaveBeenCalledWith("refresh-rejected");
    expect(store.setAnonymous).not.toHaveBeenCalled();
    expect(store.isAuthorized.value).toBe(false);
  });

  it("throws on a transient failure so the loop can retry", async () => {
    const store = makeFakeStore();
    const api = makeFakeApi();
    api.sendRefreshAccessTokenRequest.mockResolvedValue({ success: false, error: RefreshErrorResults.FailedToRefresh });
    const { session } = makeSession(store, api);

    await expect(session.refreshAccessToken()).rejects.toThrow();
    expect(store.setAnonymous).not.toHaveBeenCalled();
  });
});

describe("createIdentitySession - logout", () => {
  it("clears local state on success", async () => {
    const store = makeFakeStore();
    store.setAuthenticated(aUser);
    const api = makeFakeApi();
    api.sendLogoutRequest.mockResolvedValue(undefined);
    const { session } = makeSession(store, api);

    await session.logout();

    expect(store.clearToken).toHaveBeenCalled();
    expect(store.setAnonymous).toHaveBeenCalled();
  });

  it("clears local state even when the server call fails", async () => {
    const store = makeFakeStore();
    store.setAuthenticated(aUser);
    const api = makeFakeApi();
    api.sendLogoutRequest.mockRejectedValue(new Error("offline"));
    const { session } = makeSession(store, api);

    await expect(session.logout()).resolves.toBeUndefined();
    expect(store.clearToken).toHaveBeenCalled();
    expect(store.setAnonymous).toHaveBeenCalled();
  });
});

describe("createIdentitySession - fetchMe", () => {
  it("skips the network when there is no token and force is false", async () => {
    const store = makeFakeStore();
    const api = makeFakeApi();
    const fetchUser = vi.fn();
    const { session } = makeSession(store, api, fetchUser);

    const result = await session.fetchMe();

    expect(result).toEqual({ success: false, error: LoginErrorResults.IsNotAuthorizedForUserData });
    expect(fetchUser).not.toHaveBeenCalled();
  });

  it("loads the user when forced", async () => {
    const store = makeFakeStore();
    const api = makeFakeApi();
    const fetchUser = vi.fn().mockResolvedValue({ success: true, value: aUser });
    const { session } = makeSession(store, api, fetchUser);

    const result = await session.fetchMe(true);

    expect(result).toEqual({ success: true });
    expect(store.setAuthenticated).toHaveBeenCalledWith(aUser);
  });
});

describe("createIdentitySession - bootstrap", () => {
  it("settles to anonymous when no token is present", async () => {
    const store = makeFakeStore();
    store.status.value = "unknown";
    const fetchUser = vi.fn();
    const { session } = makeSession(store, makeFakeApi(), fetchUser);

    await session.bootstrap({ hasToken: false });

    expect(fetchUser).not.toHaveBeenCalled();
    expect(store.setAnonymous).toHaveBeenCalled();
  });

  it("loads the user when a token is present", async () => {
    const store = makeFakeStore();
    store.status.value = "unknown";
    const fetchUser = vi.fn().mockResolvedValue({ success: true, value: aUser });
    const { session } = makeSession(store, makeFakeApi(), fetchUser);

    await session.bootstrap({ hasToken: true });

    expect(store.setAuthenticated).toHaveBeenCalledWith(aUser);
    expect(store.isAuthorized.value).toBe(true);
  });

  it("settles to anonymous when a present token is rejected", async () => {
    const store = makeFakeStore();
    store.status.value = "unknown";
    const fetchUser = vi.fn().mockResolvedValue({ success: false, error: LoginErrorResults.FailedToFetchMe });
    const { session } = makeSession(store, makeFakeApi(), fetchUser);

    await session.bootstrap({ hasToken: true });

    expect(store.setAnonymous).toHaveBeenCalled();
    expect(store.isAuthorized.value).toBe(false);
  });

  it("leaves the session unknown on failure when settleAnonymousOnFailure is false (SSR retry safety net)", async () => {
    const store = makeFakeStore();
    store.status.value = "unknown";
    const fetchUser = vi.fn().mockResolvedValue({ success: false, error: LoginErrorResults.FailedToFetchMe });
    const { session } = makeSession(store, makeFakeApi(), fetchUser);

    await session.bootstrap({ hasToken: true, settleAnonymousOnFailure: false });

    expect(store.setAnonymous).not.toHaveBeenCalled();
    expect(store.status.value).toBe("unknown");
  });

  it("is single-flight — concurrent calls share one me round-trip", async () => {
    const store = makeFakeStore();
    store.status.value = "unknown";
    const fetchUser = vi.fn().mockResolvedValue({ success: true, value: aUser });
    const { session } = makeSession(store, makeFakeApi(), fetchUser);

    await Promise.all([session.bootstrap({ hasToken: true }), session.bootstrap({ hasToken: true })]);

    expect(fetchUser).toHaveBeenCalledTimes(1);
  });

  it("falls back to the store's cookie when no hint is given", async () => {
    const store = makeFakeStore();
    store.status.value = "unknown";
    store.setHasToken(false);
    const fetchUser = vi.fn();
    const { session } = makeSession(store, makeFakeApi(), fetchUser);

    await session.bootstrap();

    expect(fetchUser).not.toHaveBeenCalled();
    expect(store.setAnonymous).toHaveBeenCalled();
  });
});

describe("createIdentitySession - bootstrap recovery from the refresh token", () => {
  it("refreshes then loads the user when only the refresh cookie is present", async () => {
    const store = makeFakeStore();
    store.status.value = "unknown";
    store.setHasToken(false);
    store.setHasRefreshToken(true);
    const api = makeFakeApi();
    api.sendRefreshAccessTokenRequest.mockResolvedValue({
      success: true,
      value: { refreshAfter: "2030-01-01T00:00:00.000Z" },
    });
    const fetchUser = vi.fn().mockResolvedValue({ success: true, value: aUser });
    const { session } = makeSession(store, api, fetchUser);

    await session.bootstrap();

    expect(api.sendRefreshAccessTokenRequest).toHaveBeenCalledOnce();
    expect(store.applyExpiry).toHaveBeenCalledWith("2030-01-01T00:00:00.000Z");
    expect(store.setAuthenticated).toHaveBeenCalledWith(aUser);
    expect(store.isAuthorized.value).toBe(true);
  });

  it("does nothing when neither cookie is present", async () => {
    const store = makeFakeStore();
    store.status.value = "unknown";
    store.setHasToken(false);
    store.setHasRefreshToken(false);
    const api = makeFakeApi();
    const fetchUser = vi.fn();
    const { session } = makeSession(store, api, fetchUser);

    await session.bootstrap();

    expect(api.sendRefreshAccessTokenRequest).not.toHaveBeenCalled();
    expect(fetchUser).not.toHaveBeenCalled();
    expect(store.setAnonymous).toHaveBeenCalled();
  });

  it("settles anonymous — not expired — when the refresh token is rejected", async () => {
    const store = makeFakeStore();
    store.status.value = "unknown";
    store.setHasToken(false);
    store.setHasRefreshToken(true);
    const api = makeFakeApi();
    api.sendRefreshAccessTokenRequest.mockResolvedValue({
      success: false,
      error: RefreshErrorResults.Unauthorized,
    });
    const fetchUser = vi.fn();
    const { session } = makeSession(store, api, fetchUser);

    await session.bootstrap();

    expect(fetchUser).not.toHaveBeenCalled();
    expect(store.setAnonymous).toHaveBeenCalled();
    // A long-lived session that simply ran out is not an interrupted session — no re-login dialog.
    expect(store.setExpired).not.toHaveBeenCalled();
  });

  it("stays unknown and retries when the server could not be reached", async () => {
    const store = makeFakeStore();
    store.status.value = "unknown";
    store.setHasToken(false);
    store.setHasRefreshToken(true);
    const api = makeFakeApi();
    api.sendRefreshAccessTokenRequest.mockResolvedValue({
      success: false,
      error: RefreshErrorResults.FailedToSendRequest,
    });
    const fetchUser = vi.fn().mockResolvedValue({ success: true, value: aUser });
    const { session } = makeSession(store, api, fetchUser);

    await session.bootstrap();

    // A network failure is not an answer: painting a logged-out shell over a session
    // that may well be alive is exactly what the SSR path already refuses to do.
    expect(store.setAnonymous).not.toHaveBeenCalled();
    expect(store.status.value).toBe("unknown");

    // …and the single-flight latch is released, so the next attempt actually retries.
    api.sendRefreshAccessTokenRequest.mockResolvedValue({
      success: true,
      value: { refreshAfter: "2030-01-01T00:00:00.000Z" },
    });

    await session.whenSettled();

    expect(api.sendRefreshAccessTokenRequest).toHaveBeenCalledTimes(2);
    expect(store.setAuthenticated).toHaveBeenCalledWith(aUser);
  });

  it("does not touch the refresh token during SSR, where a rotated cookie would be lost", async () => {
    const store = makeFakeStore();
    store.status.value = "unknown";
    store.setHasToken(false);
    store.setHasRefreshToken(true);
    const api = makeFakeApi();
    const { session } = makeSession(store, api, vi.fn());

    await session.bootstrap({ canRecover: false, settleAnonymousOnFailure: false });

    expect(api.sendRefreshAccessTokenRequest).not.toHaveBeenCalled();
  });

  it("skips recovery when the access token is already there", async () => {
    const store = makeFakeStore();
    store.status.value = "unknown";
    store.setHasToken(true);
    store.setHasRefreshToken(true);
    const api = makeFakeApi();
    const fetchUser = vi.fn().mockResolvedValue({ success: true, value: aUser });
    const { session } = makeSession(store, api, fetchUser);

    await session.bootstrap();

    expect(api.sendRefreshAccessTokenRequest).not.toHaveBeenCalled();
    expect(store.setAuthenticated).toHaveBeenCalledWith(aUser);
  });
});

describe("createIdentitySession - whenSettled", () => {
  it("resolves immediately without bootstrapping once the session is settled", async () => {
    const store = makeFakeStore(); // starts "anonymous" (settled)
    const fetchUser = vi.fn();
    const { session } = makeSession(store, makeFakeApi(), fetchUser);

    await session.whenSettled();

    expect(fetchUser).not.toHaveBeenCalled();
  });

  it("triggers bootstrap while the session is still unknown", async () => {
    const store = makeFakeStore();
    store.status.value = "unknown";
    store.setHasToken(true);
    const fetchUser = vi.fn().mockResolvedValue({ success: true, value: aUser });
    const { session } = makeSession(store, makeFakeApi(), fetchUser);

    await session.whenSettled();

    expect(fetchUser).toHaveBeenCalledTimes(1);
    expect(store.setAuthenticated).toHaveBeenCalledWith(aUser);
  });
});
