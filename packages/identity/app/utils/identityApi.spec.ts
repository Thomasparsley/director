import { describe, expect, it, vi } from "vitest";

import { LoginErrorResults, RefreshErrorResults } from "../errors/identityApiErrors";
import type { LoginCredentialsRequest } from "../types/api";

import { makeIdentityApiClient } from "./identityApi";

const baseUrl = "https://api.test/identity";

const credentials: LoginCredentialsRequest = { username: "ada", password: "s3cret" };

function makeClient(...responses: Array<Response | Error>) {
  const fetcher = vi.fn();
  for (const response of responses) {
    if (response instanceof Error)
      fetcher.mockRejectedValueOnce(response);
    else
      fetcher.mockResolvedValueOnce(response);
  }
  return { api: makeIdentityApiClient(baseUrl, { fetcher }), fetcher };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("makeIdentityApiClient sendLoginRequest", () => {
  it("posts the credentials as the JSON body to the login endpoint", async () => {
    const { api, fetcher } = makeClient(jsonResponse({ refreshAfter: "2026-07-28T10:00:00Z" }, 200));

    await api.sendLoginRequest(credentials);

    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/login`, {
      method: "post",
      body: JSON.stringify(credentials),
    });
  });

  it("returns an OK response with the parsed refreshAfter on 200", async () => {
    const { api } = makeClient(jsonResponse({ refreshAfter: "2026-07-28T10:00:00Z" }, 200));

    const result = await api.sendLoginRequest(credentials);

    expect(result).toEqual({
      success: true,
      value: { status: "OK", refreshAfter: "2026-07-28T10:00:00Z" },
    });
  });

  it("fails with FailedToLogin when a 200 body cannot be parsed", async () => {
    const { api } = makeClient(new Response("not json", { status: 200 }));

    const result = await api.sendLoginRequest(credentials);

    expect(result).toEqual({ success: false, error: LoginErrorResults.FailedToLogin });
  });

  it("succeeds with MFA_REQUIRED when a 401 carries mfaType and challengeId", async () => {
    const { api } = makeClient(jsonResponse({ mfaType: "Totp", challengeId: "chal-1" }, 401));

    const result = await api.sendLoginRequest(credentials);

    expect(result).toEqual({
      success: true,
      value: { status: "MFA_REQUIRED", mfaType: "Totp", challengeId: "chal-1" },
    });
  });

  it("fails with InvalidCredentials on a 401 without the MFA fields", async () => {
    const { api } = makeClient(jsonResponse({ title: "Unauthorized" }, 401));

    const result = await api.sendLoginRequest(credentials);

    expect(result).toEqual({ success: false, error: LoginErrorResults.InvalidCredentials });
  });

  it("fails with InvalidCredentials on a 401 carrying only one of the MFA fields", async () => {
    const { api } = makeClient(jsonResponse({ mfaType: "Totp" }, 401));

    const result = await api.sendLoginRequest(credentials);

    expect(result).toEqual({ success: false, error: LoginErrorResults.InvalidCredentials });
  });

  it("fails with InvalidCredentials on 400", async () => {
    const { api } = makeClient(new Response(null, { status: 400 }));

    const result = await api.sendLoginRequest(credentials);

    expect(result).toEqual({ success: false, error: LoginErrorResults.InvalidCredentials });
  });

  it("fails with FailedToLogin on an unexpected status", async () => {
    const { api } = makeClient(new Response(null, { status: 500 }));

    const result = await api.sendLoginRequest(credentials);

    expect(result).toEqual({ success: false, error: LoginErrorResults.FailedToLogin });
  });

  it("fails with FailedToSendLoginRequest when the fetcher rejects", async () => {
    const { api } = makeClient(new Error("network down"));

    const result = await api.sendLoginRequest(credentials);

    expect(result).toEqual({ success: false, error: LoginErrorResults.FailedToSendLoginRequest });
  });
});

describe("makeIdentityApiClient sendRefreshAccessTokenRequest", () => {
  it("posts to the token refresh endpoint", async () => {
    const { api, fetcher } = makeClient(jsonResponse({ refreshAfter: "2026-07-28T11:00:00Z" }, 200));

    await api.sendRefreshAccessTokenRequest();

    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/token-refresh`, { method: "post" });
  });

  it("returns the parsed body on 200", async () => {
    const { api } = makeClient(jsonResponse({ refreshAfter: "2026-07-28T11:00:00Z" }, 200));

    const result = await api.sendRefreshAccessTokenRequest();

    expect(result).toEqual({ success: true, value: { refreshAfter: "2026-07-28T11:00:00Z" } });
  });

  it("fails with FailedToRefresh when a 200 body cannot be parsed", async () => {
    const { api } = makeClient(new Response("not json", { status: 200 }));

    const result = await api.sendRefreshAccessTokenRequest();

    expect(result).toEqual({ success: false, error: RefreshErrorResults.FailedToRefresh });
  });

  it("fails with Unauthorized on 401 so the session can settle as expired", async () => {
    const { api } = makeClient(new Response(null, { status: 401 }));

    const result = await api.sendRefreshAccessTokenRequest();

    expect(result).toEqual({ success: false, error: RefreshErrorResults.Unauthorized });
  });

  it("fails with FailedToRefresh on an unexpected status", async () => {
    const { api } = makeClient(new Response(null, { status: 503 }));

    const result = await api.sendRefreshAccessTokenRequest();

    expect(result).toEqual({ success: false, error: RefreshErrorResults.FailedToRefresh });
  });

  it("fails with FailedToSendRequest when the fetcher rejects", async () => {
    const { api } = makeClient(new Error("network down"));

    const result = await api.sendRefreshAccessTokenRequest();

    expect(result).toEqual({ success: false, error: RefreshErrorResults.FailedToSendRequest });
  });
});

describe("makeIdentityApiClient sendLogoutRequest", () => {
  it("posts to the logout endpoint", async () => {
    const { api, fetcher } = makeClient(new Response(null, { status: 200 }));

    await api.sendLogoutRequest();

    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/logout`, { method: "post" });
  });
});
