import { describe, expect, it, vi } from "vitest";

import { PasskeyErrorResults } from "../errors/passkeyErrors";

import { makePasskeyApiClient } from "./passkeyApi";

const baseUrl = "https://api.test/auth";

function makeClient(...responses: Array<Response | Error>) {
  const fetcher = vi.fn();

  for (const response of responses) {
    if (response instanceof Error) {
      fetcher.mockRejectedValueOnce(response);
    }
    else {
      fetcher.mockResolvedValueOnce(response);
    }
  }

  return { api: makePasskeyApiClient(baseUrl, { fetcher }), fetcher };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("makePasskeyApiClient", () => {
  it("asks for enrolment options and returns the challenge", async () => {
    const challenge = { challengeId: "chal-1", options: { rp: { id: "localhost" } } };
    const { api, fetcher } = makeClient(jsonResponse(challenge, 200));

    const result = await api.sendRegisterOptionsRequest();

    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/passkey/register/options`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(result).toEqual({ success: true, value: challenge });
  });

  /**
   * The route answers 200 with no body — the credential is stored and there is nothing to say
   * about it. Insisting on JSON here reported a successful enrolment as a failure, which the
   * admin's E2E caught and this now pins.
   */
  it("treats an empty 200 from register-complete as success", async () => {
    const { api } = makeClient(new Response(null, { status: 200 }));

    const result = await api.sendRegisterCompleteRequest("chal-1", { id: "credential-1" });

    expect(result.success).toBe(true);
  });

  /**
   * The options are the server library's output and the browser library's input. Nothing here
   * reads a field, and re-encoding one is the likeliest way to break the ceremony — so the test
   * that matters is that they arrive untouched.
   */
  it("passes the signed attestation through without reshaping it", async () => {
    const { api, fetcher } = makeClient(new Response(null, { status: 200 }));
    const attestation = { id: "credential-1", response: { attestationObject: "b64url" } };

    await api.sendRegisterCompleteRequest("chal-1", attestation);

    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/passkey/register/complete`, {
      method: "POST",
      body: JSON.stringify({ challengeId: "chal-1", attestationResponse: attestation }),
    });
  });

  it("sends the username when there is one", async () => {
    const { api, fetcher } = makeClient(jsonResponse({ challengeId: "c", options: {} }, 200));

    await api.sendLoginOptionsRequest("tom");

    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/passkey/login/options`, {
      method: "POST",
      body: JSON.stringify({ username: "tom" }),
    });
  });

  /** A discoverable login has no username, and the server has to be able to tell. */
  it("omits the username for a discoverable login", async () => {
    const { api, fetcher } = makeClient(jsonResponse({ challengeId: "c", options: {} }, 200));

    await api.sendLoginOptionsRequest();

    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/passkey/login/options`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  });

  /** Enrolment without a session is its own answer: sign in, do not retry. */
  it("reports a 401 as unauthorized rather than a generic refusal", async () => {
    const { api } = makeClient(jsonResponse({}, 401));

    const result = await api.sendRegisterOptionsRequest();

    expect(result).toEqual({ success: false, error: PasskeyErrorResults.Unauthorized });
  });

  it("reports any other refusal as rejected", async () => {
    const { api } = makeClient(jsonResponse({}, 400));

    const result = await api.sendRegisterOptionsRequest();

    expect(result).toEqual({ success: false, error: PasskeyErrorResults.Rejected });
  });

  /**
   * Sign-in usually shares the backend's login rate-limit partition with the password
   * endpoint, so a 429 says nothing about the credential. Reported as `Rejected` — which
   * is what every non-2xx used to be — it reads as "your passkey was refused", and that is
   * how someone deletes a working key over a limiter they tripped by clicking twice.
   */
  it("tells a rate limit apart from a refusal, and keeps the seconds it named", async () => {
    const { api } = makeClient(jsonResponse({ scope: "login", retryAfterSeconds: 20 }, 429));

    const result = await api.sendLoginOptionsRequest();

    expect(result).toEqual({
      success: false,
      error: PasskeyErrorResults.RateLimited,
      retryAfterSeconds: 20,
    });
  });

  it("reports a globally rate-limited request as its own outcome", async () => {
    const { api } = makeClient(jsonResponse({ scope: "global" }, 429));

    const result = await api.sendLoginOptionsRequest();

    expect(result).toEqual({
      success: false,
      error: PasskeyErrorResults.GloballyRateLimited,
      retryAfterSeconds: undefined,
    });
  });

  it("reports a 5xx as ServerUnavailable — nothing about the credential was judged", async () => {
    const { api } = makeClient(new Response(null, { status: 500 }));

    const result = await api.sendLoginOptionsRequest();

    expect(result).toEqual({ success: false, error: PasskeyErrorResults.ServerUnavailable });
  });

  /**
   * A request that never left is not a refusal. Retrying is reasonable here and pointless
   * for a 400, which is why they are different values rather than one failure.
   */
  it("separates a request that never sent from one the server refused", async () => {
    const { api } = makeClient(new Error("offline"));

    const result = await api.sendLoginOptionsRequest("tom");

    expect(result).toEqual({ success: false, error: PasskeyErrorResults.FailedToSendRequest });
  });
});
