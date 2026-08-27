/**
 * String literals, matching the convention in `identityApiErrors.ts`: they appear verbatim
 * in logs, and no member is falsy so `if (error)` cannot skip the first one.
 */
export const PasskeyErrorResults = {
  /** The request never completed — offline, timed out, refused by CORS. */
  FailedToSendRequest: "FailedToSendRequest",

  /** The server answered, and said no. */
  Rejected: "Rejected",

  /** Enrolment was asked for without a session. */
  Unauthorized: "Unauthorized",

  /**
   * The person dismissed the browser's prompt, or the platform refused it.
   *
   * Distinct from every other failure because it is not one: the usual cause is someone
   * closing the dialog, which deserves silence rather than an error banner. A client that
   * collapses this into a generic failure shouts at a user who simply changed their mind —
   * the single most common mistake in a WebAuthn front end.
   */
  Cancelled: "Cancelled",

  /** The browser has no WebAuthn at all, so there is nothing to offer. */
  Unsupported: "Unsupported",

  /** The ceremony ran but produced nothing usable. */
  CeremonyFailed: "CeremonyFailed",

  /** `identity.passkeyApi` was never configured, so there is nothing to call. */
  NotConfigured: "NotConfigured",

  /**
   * A login limiter refused; the credential itself was never judged.
   *
   * Its own code rather than `Rejected`, because "your passkey was refused" is how a
   * person ends up deleting a perfectly good credential over a limiter they tripped by
   * clicking twice. Passkey sign-in typically shares its backend's login rate-limit
   * partition with the password endpoint, so this says nothing whatsoever about the key.
   */
  RateLimited: "RateLimited",

  /** A limiter that counts every request refused — need not be about signing in at all. */
  GloballyRateLimited: "GloballyRateLimited",

  /** The backend broke. Same story as `RateLimited`: nothing about the credential. */
  ServerUnavailable: "ServerUnavailable",
} as const;

export type PasskeyErrorResults = typeof PasskeyErrorResults[keyof typeof PasskeyErrorResults];

/**
 * The failed arm of a passkey result. Like `LoginFailure`, it is the plain
 * `{ success: false, error }` pair widened with the seconds a rate-limit window has
 * left — so nothing that only reads `result.error` has to change.
 */
export type PasskeyFailure = {
  readonly success: false
  readonly error: PasskeyErrorResults
  /** Seconds until the limiter's window resets, when the server said. */
  readonly retryAfterSeconds?: number
};

export type PasskeyResult<T> = { readonly success: true, readonly value: T } | PasskeyFailure;
