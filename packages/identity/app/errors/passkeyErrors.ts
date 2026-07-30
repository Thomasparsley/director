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
} as const;

export type PasskeyErrorResults = typeof PasskeyErrorResults[keyof typeof PasskeyErrorResults];
