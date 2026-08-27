import { describe, expect, it, vi } from "vitest";

import { ChallengeErrors } from "../errors/identityApiErrors";

import { makeIdentityChallengeApiClient } from "./identityChallengeApi";

const baseUrl = "https://api.test/identity";
const challengeId = "chal-1";
const code = "123456";

function makeClient(...responses: Array<Response | Error>) {
  const fetcher = vi.fn();
  for (const response of responses) {
    if (response instanceof Error)
      fetcher.mockRejectedValueOnce(response);
    else
      fetcher.mockResolvedValueOnce(response);
  }
  return { api: makeIdentityChallengeApiClient(baseUrl, { fetcher }), fetcher };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("makeIdentityChallengeApiClient sendCreateStepUpChallengeRequest", () => {
  it("posts the purpose to the MFA challenge endpoint", async () => {
    const { api, fetcher } = makeClient(jsonResponse({ challengeId, mfaType: "Totp" }, 200));

    await api.sendCreateStepUpChallengeRequest("change-password");

    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/challenge/mfa`, {
      method: "post",
      body: JSON.stringify({ purpose: "change-password" }),
    });
  });

  it("returns the created challenge on 200", async () => {
    const { api } = makeClient(jsonResponse({ challengeId, mfaType: "Totp" }, 200));

    const result = await api.sendCreateStepUpChallengeRequest("change-password");

    expect(result).toEqual({ success: true, value: { challengeId, mfaType: "Totp" } });
  });

  it("fails with ChallengeFailed when a 200 body cannot be parsed", async () => {
    const { api } = makeClient(new Response("not json", { status: 200 }));

    const result = await api.sendCreateStepUpChallengeRequest("change-password");

    expect(result).toEqual({ success: false, error: ChallengeErrors.challengeFailed() });
  });

  it("fails with ChallengeFailed on 409, which means no MFA method is configured", async () => {
    const { api } = makeClient(new Response(null, { status: 409 }));

    const result = await api.sendCreateStepUpChallengeRequest("change-password");

    expect(result).toEqual({ success: false, error: ChallengeErrors.challengeFailed() });
  });

  it("fails with ChallengeFailed on 401, which means the session is gone rather than the code", async () => {
    const { api } = makeClient(new Response(null, { status: 401 }));

    const result = await api.sendCreateStepUpChallengeRequest("change-password");

    expect(result).toEqual({ success: false, error: ChallengeErrors.challengeFailed() });
  });

  it("fails with ChallengeExpired on any other status", async () => {
    const { api } = makeClient(new Response(null, { status: 404 }));

    const result = await api.sendCreateStepUpChallengeRequest("change-password");

    expect(result).toEqual({ success: false, error: ChallengeErrors.challengeExpired() });
  });

  it("fails with NetworkError when the fetcher rejects", async () => {
    const { api } = makeClient(new Error("network down"));

    const result = await api.sendCreateStepUpChallengeRequest("change-password");

    expect(result).toEqual({ success: false, error: ChallengeErrors.networkError() });
  });
});

describe("makeIdentityChallengeApiClient sendValidateChallengeRequest", () => {
  it("posts the challenge id and code to the validate endpoint", async () => {
    const { api, fetcher } = makeClient(new Response(null, { status: 200 }));

    await api.sendValidateChallengeRequest(challengeId, code);

    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/challenge/validate`, {
      method: "post",
      body: JSON.stringify({ challengeId, code }),
    });
  });

  it("returns the challenge id on 200 without reading the body", async () => {
    const { api } = makeClient(new Response("not json", { status: 200 }));

    const result = await api.sendValidateChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: true, value: { challengeId } });
  });

  it("fails with AlreadyValidated on 409", async () => {
    const { api } = makeClient(new Response(null, { status: 409 }));

    const result = await api.sendValidateChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: false, error: ChallengeErrors.alreadyValidated() });
  });

  it("fails with InvalidCode carrying the remaining attempts on a 401 that reports them", async () => {
    const { api } = makeClient(jsonResponse({ remainingAttempts: 2 }, 401));

    const result = await api.sendValidateChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: false, error: ChallengeErrors.invalidCode(2) });
  });

  it("fails with InvalidCode carrying zero when the last attempt is spent", async () => {
    const { api } = makeClient(jsonResponse({ remainingAttempts: 0 }, 401));

    const result = await api.sendValidateChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: false, error: ChallengeErrors.invalidCode(0) });
  });

  it("fails with ChallengeFailed on a 401 without remaining attempts", async () => {
    const { api } = makeClient(jsonResponse({ title: "Unauthorized" }, 401));

    const result = await api.sendValidateChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: false, error: ChallengeErrors.challengeFailed() });
  });

  it("fails with ChallengeFailed on a 401 whose body cannot be parsed", async () => {
    const { api } = makeClient(new Response("not json", { status: 401 }));

    const result = await api.sendValidateChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: false, error: ChallengeErrors.challengeFailed() });
  });

  it("fails with ChallengeExpired on any other status", async () => {
    const { api } = makeClient(new Response(null, { status: 410 }));

    const result = await api.sendValidateChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: false, error: ChallengeErrors.challengeExpired() });
  });

  it("fails with NetworkError when the fetcher rejects", async () => {
    const { api } = makeClient(new Error("network down"));

    const result = await api.sendValidateChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: false, error: ChallengeErrors.networkError() });
  });
});

describe("makeIdentityChallengeApiClient sendConsumeChallengeRequest", () => {
  it("posts the challenge id to the consume endpoint", async () => {
    const { api, fetcher } = makeClient(jsonResponse({ refreshAfter: "2026-07-28T10:00:00Z" }, 200));

    await api.sendConsumeChallengeRequest(challengeId);

    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/challenge/consume`, {
      method: "post",
      body: JSON.stringify({ challengeId }),
    });
  });

  it("returns the issued token response on 200", async () => {
    const { api } = makeClient(jsonResponse({ refreshAfter: "2026-07-28T10:00:00Z" }, 200));

    const result = await api.sendConsumeChallengeRequest(challengeId);

    expect(result).toEqual({ success: true, value: { refreshAfter: "2026-07-28T10:00:00Z" } });
  });

  it("fails with ChallengeFailed when a 200 body cannot be parsed", async () => {
    const { api } = makeClient(new Response("not json", { status: 200 }));

    const result = await api.sendConsumeChallengeRequest(challengeId);

    expect(result).toEqual({ success: false, error: ChallengeErrors.challengeFailed() });
  });

  it("fails with ChallengeFailed on 401, which covers a not-yet-validated challenge", async () => {
    const { api } = makeClient(new Response(null, { status: 401 }));

    const result = await api.sendConsumeChallengeRequest(challengeId);

    expect(result).toEqual({ success: false, error: ChallengeErrors.challengeFailed() });
  });

  it("fails with AlreadyValidated on 409, like its two siblings", async () => {
    const { api } = makeClient(new Response(null, { status: 409 }));

    const result = await api.sendConsumeChallengeRequest(challengeId);

    expect(result).toEqual({ success: false, error: ChallengeErrors.alreadyValidated() });
  });

  it("fails with ChallengeExpired on any other status", async () => {
    const { api } = makeClient(new Response(null, { status: 404 }));

    const result = await api.sendConsumeChallengeRequest(challengeId);

    expect(result).toEqual({ success: false, error: ChallengeErrors.challengeExpired() });
  });

  it("fails with NetworkError when the fetcher rejects", async () => {
    const { api } = makeClient(new Error("network down"));

    const result = await api.sendConsumeChallengeRequest(challengeId);

    expect(result).toEqual({ success: false, error: ChallengeErrors.networkError() });
  });
});

describe("makeIdentityChallengeApiClient sendValidateAndConsumeChallengeRequest", () => {
  it("posts the challenge id and code to the validate-and-consume endpoint", async () => {
    const { api, fetcher } = makeClient(jsonResponse({ refreshAfter: "2026-07-28T10:00:00Z" }, 200));

    await api.sendValidateAndConsumeChallengeRequest(challengeId, code);

    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/challenge/validate-and-consume`, {
      method: "post",
      body: JSON.stringify({ challengeId, code }),
    });
  });

  it("returns the issued token response on 200", async () => {
    const { api } = makeClient(jsonResponse({ refreshAfter: "2026-07-28T10:00:00Z" }, 200));

    const result = await api.sendValidateAndConsumeChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: true, value: { refreshAfter: "2026-07-28T10:00:00Z" } });
  });

  it("fails with ChallengeFailed when a 200 body cannot be parsed", async () => {
    const { api } = makeClient(new Response("not json", { status: 200 }));

    const result = await api.sendValidateAndConsumeChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: false, error: ChallengeErrors.challengeFailed() });
  });

  it("fails with AlreadyValidated on 409", async () => {
    const { api } = makeClient(new Response(null, { status: 409 }));

    const result = await api.sendValidateAndConsumeChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: false, error: ChallengeErrors.alreadyValidated() });
  });

  it("fails with InvalidCode carrying the remaining attempts on a 401 that reports them", async () => {
    const { api } = makeClient(jsonResponse({ remainingAttempts: 1 }, 401));

    const result = await api.sendValidateAndConsumeChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: false, error: ChallengeErrors.invalidCode(1) });
  });

  it("fails with ChallengeFailed on a 401 without remaining attempts", async () => {
    const { api } = makeClient(jsonResponse({ title: "Unauthorized" }, 401));

    const result = await api.sendValidateAndConsumeChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: false, error: ChallengeErrors.challengeFailed() });
  });

  it("fails with ChallengeExpired on any other status", async () => {
    const { api } = makeClient(new Response(null, { status: 404 }));

    const result = await api.sendValidateAndConsumeChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: false, error: ChallengeErrors.challengeExpired() });
  });

  it("fails with NetworkError when the fetcher rejects", async () => {
    const { api } = makeClient(new Error("network down"));

    const result = await api.sendValidateAndConsumeChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: false, error: ChallengeErrors.networkError() });
  });
});

describe("makeIdentityChallengeApiClient transport refusals", () => {
  // These four endpoints typically share a rate-limit partition with the login endpoint,
  // so a 429 says nothing about the challenge — and "your session expired" would send the
  // user back to the password form to spend more of the budget that just ran out.
  it("reports a 429 as RateLimited, with the scope and seconds the limiter named", async () => {
    const { api } = makeClient(jsonResponse({ scope: "login", retryAfterSeconds: 34 }, 429));

    const result = await api.sendValidateAndConsumeChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: false, error: ChallengeErrors.rateLimited("login", 34) });
  });

  it("reports a 429 with no readable body as RateLimited without detail", async () => {
    const { api } = makeClient(new Response("Too Many Requests", { status: 429 }));

    const result = await api.sendValidateChallengeRequest(challengeId, code);

    expect(result).toEqual({ success: false, error: ChallengeErrors.rateLimited(undefined, undefined) });
  });

  it("reports a 5xx as ServerUnavailable — the code was never judged", async () => {
    const { api } = makeClient(new Response(null, { status: 502 }));

    const result = await api.sendConsumeChallengeRequest(challengeId);

    expect(result).toEqual({ success: false, error: ChallengeErrors.serverUnavailable() });
  });

  it("tells a timed-out request apart from one that never opened", async () => {
    const timeout = new Error("timed out");
    timeout.name = "TimeoutError";
    const { api } = makeClient(timeout);

    const result = await api.sendCreateStepUpChallengeRequest("change-password");

    expect(result).toEqual({ success: false, error: ChallengeErrors.requestTimedOut() });
  });
});
