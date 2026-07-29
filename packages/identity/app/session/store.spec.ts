import { beforeEach, describe, expect, it } from "vitest";

// Resolved to the same module the store reaches via the `#app` alias (see
// vitest.config.ts), so seeding cookies here is what the store sees.
import { cookieCalls, cookieSeeds, resetNuxtAppStub } from "../../test/nuxtApp";
import type { IdentityUser } from "../types/user";

import { useSessionStore } from "./store";

const aUser = { name: "a" } as IdentityUser;

describe("useSessionStore - state machine", () => {
  beforeEach(() => resetNuxtAppStub());

  it("marks the session authenticated and exposes the user", () => {
    const store = useSessionStore();
    store.setAuthenticated(aUser);

    expect(store.status.value).toBe("authenticated");
    expect(store.isAuthorized.value).toBe(true);
    expect(store.user.value).toEqual(aUser);
  });

  it("setAnonymous clears the user and authorization", () => {
    const store = useSessionStore();
    store.setAuthenticated(aUser);
    store.setAnonymous();

    expect(store.status.value).toBe("anonymous");
    expect(store.isAuthorized.value).toBe(false);
    expect(store.user.value).toBeUndefined();
  });

  it("authenticating is not yet authorized", () => {
    const store = useSessionStore();
    store.setAuthenticating();

    expect(store.status.value).toBe("authenticating");
    expect(store.isAuthorized.value).toBe(false);
  });

  it("expired drops authorization and records the reason", () => {
    const store = useSessionStore();
    store.setAuthenticated(aUser);
    store.setExpired("idle-timeout");

    expect(store.status.value).toBe("expired");
    expect(store.isAuthorized.value).toBe(false);
  });

  it("shares one reactive state across instances", () => {
    useSessionStore().setAuthenticated(aUser);
    // A separately-obtained instance sees the same state.
    expect(useSessionStore().isAuthorized.value).toBe(true);
  });
});

describe("useSessionStore - token expiry", () => {
  beforeEach(() => resetNuxtAppStub());

  it("applyExpiry records the expiry as epoch ms", () => {
    const store = useSessionStore();
    const iso = "2030-01-01T00:00:00.000Z";
    store.applyExpiry(iso);
    expect(store.expiresAtMs.value).toBe(Date.parse(iso));
  });

  it("clearToken forgets the expiry", () => {
    const store = useSessionStore();
    store.applyExpiry("2030-01-01T00:00:00.000Z");
    store.clearToken();
    expect(store.expiresAtMs.value).toBeNull();
  });
});

describe("useSessionStore - shared cookie ownership (B4)", () => {
  beforeEach(() => resetNuxtAppStub());

  it("uses a single cookie ref so a clear in one instance is seen by another", () => {
    cookieSeeds["has_acc_tkn"] = "true";

    const a = useSessionStore();
    const b = useSessionStore();
    expect(a.hasAccessToken.value).toBe(true);
    expect(b.hasAccessToken.value).toBe(true);

    a.clearToken();

    // Without a shared ref (the old bug) b would still report true.
    expect(b.hasAccessToken.value).toBe(false);
  });

  it("creates the underlying cookie refs only once per app", () => {
    useSessionStore();
    useSessionStore();
    useSessionStore();

    // One per cookie: has_acc_tkn and has_rfrsh_tkn.
    expect(cookieCalls.count).toBe(2);
  });
});

describe("useSessionStore - refresh token cookie", () => {
  beforeEach(() => resetNuxtAppStub());

  it("reports the refresh cookie independently of the access token", () => {
    cookieSeeds["has_rfrsh_tkn"] = "true";

    const store = useSessionStore();

    // The "logged in yesterday, browser restarted" state that startup recovery keys off.
    expect(store.hasAccessToken.value).toBe(false);
    expect(store.hasRefreshToken.value).toBe(true);
  });

  it("clearToken drops the refresh marker too", () => {
    cookieSeeds["has_acc_tkn"] = "true";
    cookieSeeds["has_rfrsh_tkn"] = "true";

    const store = useSessionStore();
    expect(store.hasRefreshToken.value).toBe(true);

    store.clearToken();

    // Otherwise bootstrap would keep retrying a session the server has already killed.
    expect(store.hasRefreshToken.value).toBe(false);
  });
});

describe("useSessionStore - configurable cookie names", () => {
  beforeEach(() => resetNuxtAppStub({
    identity: {
      cookies: { hasAccessToken: "my_acc", hasRefreshToken: "my_rfrsh" },
    },
  }));

  it("reads the marker cookies under the app-configured names", () => {
    cookieSeeds["my_acc"] = "true";
    cookieSeeds["my_rfrsh"] = "true";

    const store = useSessionStore();

    expect(store.hasAccessToken.value).toBe(true);
    expect(store.hasRefreshToken.value).toBe(true);
  });
});
