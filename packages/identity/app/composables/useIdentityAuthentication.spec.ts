import { beforeEach, describe, expect, it, vi } from "vitest";

import { cookieSeeds, resetNuxtAppStub } from "../../test/nuxtApp";
import type { IdentityApi } from "../types/identityApi";
import type { IdentityUser } from "../types/user";

import { useIdentityAuthentication } from "./useIdentityAuthentication";

function makeApi(overrides: Partial<IdentityApi> = {}): IdentityApi {
  return {
    sendLoginRequest: vi.fn(),
    sendRefreshAccessTokenRequest: vi.fn(),
    sendLogoutRequest: vi.fn(),
    fetchUser: vi.fn().mockResolvedValue({ success: true, value: {} as IdentityUser }),
    ...overrides,
  };
}

describe("useIdentityAuthentication", () => {
  beforeEach(() => resetNuxtAppStub({ identity: { api: () => makeApi() } }));

  it("is memoised per app", () => {
    expect(useIdentityAuthentication()).toBe(useIdentityAuthentication());
  });

  it("shares one bootstrap round-trip across separately obtained services", async () => {
    const fetchUser = vi.fn().mockResolvedValue({ success: true, value: {} as IdentityUser });
    resetNuxtAppStub({ identity: { api: () => makeApi({ fetchUser }) } });
    cookieSeeds["has_acc_tkn"] = "true";

    // A second service instance would carry its own single-flight latch, quietly
    // reintroducing the duplicate `me` call the latch exists to prevent.
    await Promise.all([
      useIdentityAuthentication().bootstrap(),
      useIdentityAuthentication().bootstrap(),
    ]);

    expect(fetchUser).toHaveBeenCalledTimes(1);
  });
});
