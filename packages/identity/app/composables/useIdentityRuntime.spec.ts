import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetNuxtAppStub } from "../../test/nuxtApp";
import { defaultIdentityCookieNames, defaultIdentityTiming } from "../config";
import type { IdentityApi } from "../types/identityApi";

import { useIdentityRuntime } from "./useIdentityRuntime";

function makeApi(): IdentityApi {
  return {
    sendLoginRequest: vi.fn(),
    sendRefreshAccessTokenRequest: vi.fn(),
    sendLogoutRequest: vi.fn(),
    fetchUser: vi.fn(),
  };
}

describe("useIdentityRuntime", () => {
  beforeEach(() => resetNuxtAppStub());

  it("falls back to the default timing and cookie names without app config", () => {
    const runtime = useIdentityRuntime();

    expect(runtime.timing).toEqual(defaultIdentityTiming);
    expect(runtime.cookieNames).toEqual(defaultIdentityCookieNames);
    expect(runtime.hasApi).toBe(false);
  });

  it("merges partial timing and cookie overrides over the defaults", () => {
    resetNuxtAppStub({
      identity: {
        timing: { idleAfterMs: 1_000 },
        cookies: { hasAccessToken: "custom_acc" },
      },
    });

    const runtime = useIdentityRuntime();

    expect(runtime.timing.idleAfterMs).toBe(1_000);
    expect(runtime.timing.refreshLeadMs).toBe(defaultIdentityTiming.refreshLeadMs);
    expect(runtime.cookieNames.hasAccessToken).toBe("custom_acc");
    expect(runtime.cookieNames.hasRefreshToken).toBe(defaultIdentityCookieNames.hasRefreshToken);
  });

  it("throws a descriptive error when the API is used but not configured", () => {
    const runtime = useIdentityRuntime();

    expect(() => runtime.api).toThrowError(/identity\.api/);
    expect(() => runtime.challengeApi).toThrowError(/identity\.challengeApi/);
  });

  it("builds the app's API lazily, once, and shares it across calls", () => {
    const api = makeApi();
    const factory = vi.fn(() => api);
    resetNuxtAppStub({ identity: { api: factory } });

    const runtime = useIdentityRuntime();
    expect(runtime.hasApi).toBe(true);
    expect(factory).not.toHaveBeenCalled();

    expect(runtime.api).toBe(api);
    expect(useIdentityRuntime().api).toBe(api);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("is memoised per app — two calls share one runtime", () => {
    expect(useIdentityRuntime()).toBe(useIdentityRuntime());
  });
});
