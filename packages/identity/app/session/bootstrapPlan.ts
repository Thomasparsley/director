/**
 * What the server is allowed to do with the identity cookies it was handed.
 *
 * This lived inline in `plugins/identity.ts`, which made the single most
 * consequential decision on every server-rendered page unreachable from a unit test
 * — you could only observe it through a built app, a browser and a mock backend. It
 * is a pure function of two booleans; it belongs here, with the matrix spelled out
 * in `bootstrapPlan.spec.ts`.
 */
export const SessionBootstrapPlans = {
  /** Ask the backend (or settle anonymous outright) before rendering a byte. */
  Resolve: "resolve",
  /** Render without deciding, and let the browser settle it after hydration. */
  DeferToClient: "defer-to-client",
} as const;

export type SessionBootstrapPlan = typeof SessionBootstrapPlans[keyof typeof SessionBootstrapPlans];

/** Why the plan is what it is. Named so a test — and a log line — can say it. */
export const SessionBootstrapReasons = {
  /** No identity cookies at all: this is a visitor, settle anonymous with no call. */
  NoCookies: "no-cookies",
  /** An access token marker is present: "me" can be asked on this request's behalf. */
  AccessTokenPresent: "access-token-present",
  /**
   * Only the refresh marker survived — the ordinary state of a returning visitor,
   * because an access token typically dies in minutes while the refresh cookie lives
   * for days. Spending it means rotating it, and only the browser owns the cookie jar
   * the successor has to be written into, so the server must not try.
   */
  RefreshTokenOnly: "refresh-token-only",
} as const;

export type SessionBootstrapReason = typeof SessionBootstrapReasons[keyof typeof SessionBootstrapReasons];

export interface SsrSessionSignals {
  /** The JS-readable marker for the httpOnly access token (`identity.cookies.hasAccessToken`). */
  readonly hasAccessToken: boolean
  /** The marker for the httpOnly refresh token (`identity.cookies.hasRefreshToken`). */
  readonly hasRefreshToken: boolean
}

export interface SsrSessionDecision {
  readonly plan: SessionBootstrapPlan
  readonly reason: SessionBootstrapReason
}

/**
 * Decides whether SSR resolves the session itself or defers to the browser.
 *
 * Note what is NOT here: whether the resolution succeeded. `Resolve` only means "the
 * server is allowed to decide"; what it then decides — authenticated, anonymous, or
 * still `unknown` because nothing answered — belongs to the state machine in
 * `sessionService.ts`.
 */
export function planSsrSession({ hasAccessToken, hasRefreshToken }: SsrSessionSignals): SsrSessionDecision {
  if (hasAccessToken) {
    return {
      plan: SessionBootstrapPlans.Resolve,
      reason: SessionBootstrapReasons.AccessTokenPresent,
    };
  }

  if (hasRefreshToken) {
    return {
      plan: SessionBootstrapPlans.DeferToClient,
      reason: SessionBootstrapReasons.RefreshTokenOnly,
    };
  }

  return {
    plan: SessionBootstrapPlans.Resolve,
    reason: SessionBootstrapReasons.NoCookies,
  };
}
