import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetNuxtAppStub } from "../../test/nuxtApp";
import { ChallengeErrors, LoginErrorResults } from "../errors/identityApiErrors";
import type { ChallengeError } from "../errors/identityApiErrors";
import type { IdentityApi, IdentityChallengeApi } from "../types/identityApi";
import type { IdentityUser } from "../types/user";

import { useIdentityChallenge } from "./useIdentityChallenge";

function makeApi(): IdentityApi {
  return {
    sendLoginRequest: vi.fn(),
    sendRefreshAccessTokenRequest: vi.fn(),
    sendLogoutRequest: vi.fn(),
    fetchUser: vi.fn().mockResolvedValue({ success: true, value: {} as IdentityUser }),
  };
}

/** Every challenge call answers with the same failure, so one spec can drive any leg. */
function makeChallengeApi(error: ChallengeError): IdentityChallengeApi {
  const fail = vi.fn().mockResolvedValue({ success: false, error });
  return {
    sendCreateStepUpChallengeRequest: fail,
    sendValidateChallengeRequest: fail,
    sendConsumeChallengeRequest: fail,
    sendValidateAndConsumeChallengeRequest: fail,
  };
}

function withChallengeError(error: ChallengeError): void {
  resetNuxtAppStub({
    identity: {
      api: () => makeApi(),
      challengeApi: () => makeChallengeApi(error),
    },
  });
}

describe("useIdentityChallenge transport failures", () => {
  beforeEach(() => resetNuxtAppStub());

  it("reports a rate limit as TooManyAttempts, not as an expired challenge", async () => {
    // The old mapping fell through to ChallengeExpired, which sends the user back to the
    // password form to spend two more permits on the partition that just refused them.
    withChallengeError(ChallengeErrors.rateLimited("login", 34));

    const result = await useIdentityChallenge().completeMfaChallenge("chal-1", "123456");

    expect(result).toEqual({
      success: false,
      error: LoginErrorResults.TooManyAttempts,
      retryAfterSeconds: 34,
    });
  });

  it("reports a global rate limit as TooManyRequests", async () => {
    withChallengeError(ChallengeErrors.rateLimited("global", 5));

    const result = await useIdentityChallenge().completeMfaChallenge("chal-1", "123456");

    expect(result).toEqual({
      success: false,
      error: LoginErrorResults.TooManyRequests,
      retryAfterSeconds: 5,
    });
  });

  it("reports a broken backend as ServerUnavailable", async () => {
    withChallengeError(ChallengeErrors.serverUnavailable());

    const result = await useIdentityChallenge().completeStepUpChallenge("chal-1", "123456");

    expect(result).toEqual({ success: false, error: LoginErrorResults.ServerUnavailable });
  });

  it("keeps a timeout apart from a request that never opened", async () => {
    withChallengeError(ChallengeErrors.requestTimedOut());

    const result = await useIdentityChallenge().completeMfaChallenge("chal-1", "123456");

    expect(result).toEqual({ success: false, error: LoginErrorResults.RequestTimedOut });
  });

  it("reports an unreachable server as a request that could not be sent", async () => {
    withChallengeError(ChallengeErrors.networkError());

    const result = await useIdentityChallenge().completeMfaChallenge("chal-1", "123456");

    expect(result).toEqual({ success: false, error: LoginErrorResults.FailedToSendLoginRequest });
  });

  it("passes a transport failure through the step-up creation leg too", async () => {
    // Nothing has expired here — no challenge exists yet — so the only question is
    // whether the refusal was about the transport.
    withChallengeError(ChallengeErrors.rateLimited("login", 12));

    const result = await useIdentityChallenge().createStepUpChallenge("change-password");

    expect(result).toEqual({
      success: false,
      error: LoginErrorResults.TooManyAttempts,
      retryAfterSeconds: 12,
    });
  });
});

describe("useIdentityChallenge challenge failures", () => {
  beforeEach(() => resetNuxtAppStub());

  it("carries the remaining attempts alongside an invalid code", async () => {
    // The count has always been on the response; flattening it to a bare code is what
    // left the user to discover the limit by hitting it.
    withChallengeError(ChallengeErrors.invalidCode(2));

    const result = await useIdentityChallenge().completeMfaChallenge("chal-1", "000000");

    expect(result).toEqual({
      success: false,
      error: LoginErrorResults.InvalidMfaCode,
      remainingAttempts: 2,
    });
  });

  it("reads an already-validated challenge as an expired one", async () => {
    withChallengeError(ChallengeErrors.alreadyValidated());

    const result = await useIdentityChallenge().completeMfaChallenge("chal-1", "123456");

    expect(result).toEqual({ success: false, error: LoginErrorResults.ChallengeExpired });
  });

  it("falls back to MfaChallengeFailed for a challenge that simply failed", async () => {
    withChallengeError(ChallengeErrors.challengeFailed());

    const result = await useIdentityChallenge().completeStepUpChallenge("chal-1", "123456");

    expect(result).toEqual({ success: false, error: LoginErrorResults.MfaChallengeFailed });
  });

  it("reports a step-up that could not be created at all as MfaChallengeFailed", async () => {
    withChallengeError(ChallengeErrors.challengeFailed());

    const result = await useIdentityChallenge().createStepUpChallenge("change-password");

    expect(result).toEqual({ success: false, error: LoginErrorResults.MfaChallengeFailed });
  });
});
