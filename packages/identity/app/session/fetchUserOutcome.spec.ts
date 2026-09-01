import { describe, expect, it } from "vitest";

import { LoginErrorResults } from "../errors/identityApiErrors";
import type { IdentityUser } from "../types/user";

import { classifyFetchUser } from "./fetchUserOutcome";
import { FetchUserOutcomes } from "./types";

const aUser = { name: "a" } as IdentityUser;

describe("classifyFetchUser", () => {
  it("passes a loaded user through as Ok", () => {
    expect(classifyFetchUser({ success: true, value: aUser })).toEqual({
      status: FetchUserOutcomes.Ok,
      user: aUser,
    });
  });

  it.each([
    LoginErrorResults.IsNotAuthorizedForUserData,
    LoginErrorResults.InvalidCredentials,
  ])("reads %s as the API answering \"nobody\"", (error) => {
    expect(classifyFetchUser({ success: false, error })).toMatchObject({
      status: FetchUserOutcomes.Rejected,
      error,
    });
  });

  it.each([
    LoginErrorResults.ServerUnavailable,
    LoginErrorResults.RequestTimedOut,
    LoginErrorResults.FailedToFetchMe,
    LoginErrorResults.TooManyRequests,
  ])("reads %s as no answer at all", (error) => {
    expect(classifyFetchUser({ success: false, error })).toMatchObject({
      status: FetchUserOutcomes.Unavailable,
      error,
    });
  });

  // The classification rides *alongside* the failure rather than replacing it, so
  // `fetchMe` can hand the whole thing back — a rate limit's countdown included.
  it("keeps the failure detail beside the classification", () => {
    expect(classifyFetchUser({
      success: false,
      error: LoginErrorResults.TooManyRequests,
      retryAfterSeconds: 34,
    })).toEqual({
      status: FetchUserOutcomes.Unavailable,
      success: false,
      error: LoginErrorResults.TooManyRequests,
      retryAfterSeconds: 34,
    });
  });
});
