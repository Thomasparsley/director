import { describe, expect, it } from "vitest";

import { RefreshErrorResults } from "./identityApiErrors";
import {
  IdentityError,
  IdentityErrorKinds,
  IdentityInstanceMissingError,
  IdentityNotConfiguredError,
  TokenRefreshFailedError,
} from "./identityError";

describe("the identity error hierarchy", () => {
  const cases = [
    new IdentityInstanceMissingError(),
    new IdentityNotConfiguredError("identity.passkeyApi", "no passkey API"),
    new TokenRefreshFailedError(RefreshErrorResults.FailedToRefresh),
  ];

  it.each(cases)("$name is catchable as an IdentityError", (error) => {
    expect(error).toBeInstanceOf(IdentityError);
    expect(error).toBeInstanceOf(Error);
  });

  // The whole point of the name is to survive into an error report, and a production
  // build mangles class names — so each one assigns its own rather than reading
  // `new.target.name`.
  it.each(cases)("$name keeps a name a minifier cannot take away", (error) => {
    expect(error.name).toBe(error.constructor.name);
  });

  it("gives every member a distinct kind to switch on", () => {
    expect(new Set(cases.map(e => e.kind)).size).toBe(cases.length);
    expect(Object.values(IdentityErrorKinds)).toEqual(
      expect.arrayContaining(cases.map(e => e.kind)),
    );
  });

  it("keeps the refresh code beside the message, so a handler need not parse it", () => {
    const error = new TokenRefreshFailedError(RefreshErrorResults.FailedToSendRequest);

    expect(error.result).toBe(RefreshErrorResults.FailedToSendRequest);
    expect(error.message).toContain(RefreshErrorResults.FailedToSendRequest);
  });

  it("names the app.config key an unconfigured seam is missing", () => {
    expect(new IdentityNotConfiguredError("identity.challengeApi", "nope").configKey)
      .toBe("identity.challengeApi");
  });
});
