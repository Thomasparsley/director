import { beforeEach, describe, expect, it, vi } from "vitest";

import { cookieSeeds, resetNuxtAppStub, useNuxtApp } from "../../test/nuxtApp";
import { IdentityInstanceMissingError } from "../errors/identityError";
import { defaultIdentityCookieNames } from "../config";
import { useSessionStore } from "../session/store";
import { SessionStatuses } from "../session/types";
import type { IdentityApi } from "../types/identityApi";
import type { IdentityUser } from "../types/user";

import { useIdentity, useIdentityInstance } from "./useIdentity";

const aUser = { name: "a" } as IdentityUser;

function withApi(fetchUser = vi.fn().mockResolvedValue({ success: true, value: aUser })) {
  const api: IdentityApi = {
    sendLoginRequest: vi.fn(),
    sendRefreshAccessTokenRequest: vi.fn(),
    sendLogoutRequest: vi.fn(),
    fetchUser,
  };
  resetNuxtAppStub({ identity: { api: () => api } });
  return api;
}

describe("useIdentity", () => {
  beforeEach(() => resetNuxtAppStub());

  it("names the wiring mistake when the plugin never provided an instance", () => {
    withApi();

    expect(() => useIdentity()).toThrow(IdentityInstanceMissingError);
  });

  it("hands back the instance the plugin provided", () => {
    withApi();
    const instance = useIdentityInstance();
    (useNuxtApp() as Record<string, unknown>).$identityInstance = instance;

    expect(useIdentity()).toBe(instance);
  });
});

describe("the identity instance", () => {
  beforeEach(() => resetNuxtAppStub());

  it("groups the surface by question, and keeps login/logout flat", () => {
    withApi();
    const identity = useIdentityInstance();

    expect(Object.keys(identity).sort()).toEqual(
      ["login", "logout", "permissions", "session", "viewer"],
    );
  });

  // The bug the three-state viewer exists for: an unsettled session answers `false` to
  // "is this a logged-in user?", exactly as a genuinely anonymous one does. Chrome that
  // cannot tell them apart server-renders "Sign in" at a user who never logged out.
  it("reports an unsettled session as unsettled, not as anonymous", () => {
    withApi();
    const identity = useIdentityInstance();

    expect(identity.session.status.value).toBe(SessionStatuses.Unknown);
    expect(identity.viewer.isAuthorized.value).toBe(false);
    expect(identity.viewer.isSessionSettled.value).toBe(false);
  });

  it.each([
    ["anonymous", (store: ReturnType<typeof useSessionStore>) => store.setAnonymous()],
    ["authenticated", (store: ReturnType<typeof useSessionStore>) => store.setAuthenticated(aUser)],
  ])("settles once the machine reaches %s", (_name, settle) => {
    withApi();
    const identity = useIdentityInstance();
    settle(useSessionStore());

    expect(identity.viewer.isSessionSettled.value).toBe(true);
  });

  it("exposes the same settled flag under session, for guards that never touch the viewer", () => {
    withApi();
    const identity = useIdentityInstance();

    expect(identity.session.isSettled).toBe(identity.viewer.isSessionSettled);
  });

  it("surfaces why the session expired, beside the status", () => {
    withApi();
    const identity = useIdentityInstance();
    useSessionStore().setExpired("refresh-rejected");

    expect(identity.session.status.value).toBe(SessionStatuses.Expired);
    expect(identity.session.expiredReason.value).toBe("refresh-rejected");
  });

  it("reads the viewer off the store once a user loads", async () => {
    cookieSeeds[defaultIdentityCookieNames.hasAccessToken] = "true";
    withApi();
    const identity = useIdentityInstance();

    await identity.session.refetchMe();

    expect(identity.viewer.user.value).toEqual(aUser);
    expect(identity.viewer.isAuthorized.value).toBe(true);
    expect(identity.viewer.isSessionSettled.value).toBe(true);
  });
});
