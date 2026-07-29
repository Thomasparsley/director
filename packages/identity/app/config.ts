/**
 * Production defaults for identity timing. Every value is milliseconds unless the
 * name says otherwise. Apps override any of them via `app.config` (`identity.timing`);
 * tests override by passing explicit values into the session/lifecycle factories, so
 * the numbers here only describe defaults.
 */
export interface IdentityTimingConfig {
  /**
   * Renew the access token this long before it expires. The server treats
   * `refreshAfter` as the token's actual expiry, so the effective sliding
   * window is `tokenLifetime - refreshLeadMs`.
   */
  refreshLeadMs: number

  /**
   * Floor for the scheduled refresh delay. Prevents a hot loop when the token
   * is already within (or past) the lead window at scheduling time.
   */
  refreshMinDelayMs: number

  /** Attempts for a single transient-failure refresh before giving up. */
  refreshMaxRetries: number

  /** Base delay for the exponential backoff between refresh retries. */
  refreshRetryBaseMs: number

  /**
   * A user with no pointer/keyboard/scroll/touch activity for this long is
   * considered idle. Once idle, the session is not silently renewed; the
   * keep-alive dialog is shown instead.
   */
  idleAfterMs: number

  /**
   * How long the keep-alive ("are you still there?") dialog stays open before
   * it gives up and drops the session to `expired`. Clamped at runtime so it
   * never outlives the real token expiry.
   */
  keepAliveCountdownMs: number

  /**
   * Keep the keep-alive countdown's deadline this far inside the real token
   * expiry, so confirming at the last second still leaves time for the renewal
   * round-trip to land.
   */
  keepAliveSafetyMarginMs: number

  /** Abort an identity REST call that has not responded within this budget. */
  requestTimeoutMs: number
}

export const defaultIdentityTiming: IdentityTimingConfig = {
  refreshLeadMs: 2 * 60_000,
  refreshMinDelayMs: 5_000,
  refreshMaxRetries: 3,
  refreshRetryBaseMs: 1_000,
  idleAfterMs: 10 * 60_000,
  keepAliveCountdownMs: 2 * 60_000,
  keepAliveSafetyMarginMs: 5_000,
  requestTimeoutMs: 15_000,
};

/**
 * Default names of the JS-readable marker cookies the backend sets alongside its
 * httpOnly token cookies. `hasRefreshToken`'s presence is what tells the client a
 * dead/absent access token is still recoverable — i.e. the user logged in at some
 * point and never logged out. Override via `app.config` (`identity.cookies`).
 */
export const defaultIdentityCookieNames = {
  hasAccessToken: "has_acc_tkn",
  hasRefreshToken: "has_rfrsh_tkn",
} as const;

export interface IdentityCookieNames {
  hasAccessToken: string
  hasRefreshToken: string
}
