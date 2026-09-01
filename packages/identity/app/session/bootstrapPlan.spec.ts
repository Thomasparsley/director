import { describe, expect, it } from "vitest";

import { planSsrSession, SessionBootstrapPlans, SessionBootstrapReasons } from "./bootstrapPlan";

describe("planSsrSession", () => {
  it("resolves on the server when an access token marker is present", () => {
    expect(planSsrSession({ hasAccessToken: true, hasRefreshToken: true })).toEqual({
      plan: SessionBootstrapPlans.Resolve,
      reason: SessionBootstrapReasons.AccessTokenPresent,
    });
  });

  it("resolves on an access token even with no refresh cookie beside it", () => {
    expect(planSsrSession({ hasAccessToken: true, hasRefreshToken: false })).toEqual({
      plan: SessionBootstrapPlans.Resolve,
      reason: SessionBootstrapReasons.AccessTokenPresent,
    });
  });

  // The case the whole module exists for: the ordinary returning visitor, whose
  // access token died long before the refresh cookie did. The server must not spend
  // that cookie — the exchange rotates it, and the successor would land in the wrong
  // jar — so it renders undecided and lets the browser settle after hydration.
  it("defers to the client when only the refresh marker survived", () => {
    expect(planSsrSession({ hasAccessToken: false, hasRefreshToken: true })).toEqual({
      plan: SessionBootstrapPlans.DeferToClient,
      reason: SessionBootstrapReasons.RefreshTokenOnly,
    });
  });

  it("resolves — settling anonymous — when there are no cookies at all", () => {
    expect(planSsrSession({ hasAccessToken: false, hasRefreshToken: false })).toEqual({
      plan: SessionBootstrapPlans.Resolve,
      reason: SessionBootstrapReasons.NoCookies,
    });
  });
});
