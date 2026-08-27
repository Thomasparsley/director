import type { RateLimitScope } from "../api/rateLimit";

/**
 * Error values are string literals, not numbers: they show up verbatim in logs and
 * error messages, and no member is falsy — `if (error)` cannot silently skip the
 * first one.
 */
export const RefreshErrorResults = {
  FailedToSendRequest: "FailedToSendRequest",
  FailedToRefresh: "FailedToRefresh",
  Unauthorized: "Unauthorized",
} as const;

export type RefreshErrorResults = typeof RefreshErrorResults[keyof typeof RefreshErrorResults];

/**
 * Every way a login attempt can end badly, from the credential POST through the MFA
 * challenge to the `me` call that follows it.
 *
 * The last four exist because "the login failed" is not one message but several, and
 * the right next move differs: wait a minute, come back later, check the connection,
 * or check nothing at all. A layer that collapses them leaves the app with no way to
 * tell them apart — which is how someone whose network is fine gets sent to go and
 * look at their network.
 */
export const LoginErrorResults = {
  IsNotAuthorizedForUserData: "IsNotAuthorizedForUserData",
  FailedToFetchMe: "FailedToFetchMe",
  InvalidCredentials: "InvalidCredentials",
  FailedToLogin: "FailedToLogin",
  /** The request never opened — offline, DNS, CORS, a refused connection. */
  FailedToSendLoginRequest: "FailedToSendLoginRequest",
  ChallengeExpired: "ChallengeExpired",
  InvalidMfaCode: "InvalidMfaCode",
  MfaChallengeFailed: "MfaChallengeFailed",
  /** A login limiter refused: too many *login* attempts from this address. */
  TooManyAttempts: "TooManyAttempts",
  /**
   * A limiter that counts every request refused. Distinct from `TooManyAttempts`
   * because it can happen on a first login attempt — the requests that spent the
   * budget need not have been logins at all.
   */
  TooManyRequests: "TooManyRequests",
  /** The backend (or the proxy in front of it) broke; nothing was judged. */
  ServerUnavailable: "ServerUnavailable",
  /** The request went out and no answer came back within the budget. */
  RequestTimedOut: "RequestTimedOut",
} as const;

export type LoginErrorResults = typeof LoginErrorResults[keyof typeof LoginErrorResults];

/**
 * What the server told us *besides* the code. Both fields are optional: a failure that
 * carries neither is still a well-formed failure, and an app's message for every code
 * has to work without them — nothing between the browser and the endpoint is obliged
 * to send a number.
 */
export interface LoginErrorDetail {
  /** Seconds left on the rate-limit window, when the limiter said. */
  readonly retryAfterSeconds?: number
  /** MFA attempts left on the challenge, when the server said. */
  readonly remainingAttempts?: number
}

/**
 * The failed arm of every login-family result: the plain `{ success: false, error }`
 * pair widened with the optional detail, rather than a boxed error object. Nothing that
 * only cares about the code has to change — `result.error` is still the
 * `LoginErrorResults` member — and an app that wants to say "try again in 34 seconds"
 * reads the field beside it.
 */
export type LoginFailure = {
  readonly success: false
  readonly error: LoginErrorResults
} & LoginErrorDetail;

export type LoginResult<T> = { readonly success: true, readonly value: T } | LoginFailure;

/** The `ErrorResult` shape for the login family: success carries no value. */
export type LoginErrorOnlyResult = { readonly success: true } | LoginFailure;

/**
 * Discriminated-union error for challenge API operations.
 * Use the `kind` field to narrow the type.
 * `InvalidCode` carries `remainingAttempts` so the UI can display a countdown.
 *
 * `RateLimited` and `ServerUnavailable` are about the *transport*, not the challenge: a
 * backend that puts its challenge endpoints on the same rate-limit partition as its
 * login endpoint (the shipped contract's server does) can refuse a perfectly good
 * challenge with a 429, and reading that as "expired" sends the user back to the start
 * to spend more of the very budget that just ran out.
 *
 * `NetworkError` and `RequestTimedOut` are both "no answer came back", kept apart for
 * the same reason the password leg keeps them apart — only one of them is a reason to
 * go and look at your own connection.
 */
export type ChallengeError
  = | { readonly kind: "NetworkError" }
    | { readonly kind: "RequestTimedOut" }
    | { readonly kind: "ChallengeExpired" }
    | { readonly kind: "InvalidCode", readonly remainingAttempts: number }
    | { readonly kind: "ChallengeFailed" }
    | { readonly kind: "AlreadyValidated" }
    | { readonly kind: "RateLimited", readonly scope?: RateLimitScope, readonly retryAfterSeconds?: number }
    | { readonly kind: "ServerUnavailable" };

export const ChallengeErrors = {
  networkError: (): ChallengeError => ({ kind: "NetworkError" }),
  requestTimedOut: (): ChallengeError => ({ kind: "RequestTimedOut" }),
  challengeExpired: (): ChallengeError => ({ kind: "ChallengeExpired" }),
  invalidCode: (remainingAttempts: number): ChallengeError => ({ kind: "InvalidCode", remainingAttempts }),
  challengeFailed: (): ChallengeError => ({ kind: "ChallengeFailed" }),
  alreadyValidated: (): ChallengeError => ({ kind: "AlreadyValidated" }),
  rateLimited: (scope?: RateLimitScope, retryAfterSeconds?: number): ChallengeError =>
    ({ kind: "RateLimited", scope, retryAfterSeconds }),
  serverUnavailable: (): ChallengeError => ({ kind: "ServerUnavailable" }),
} as const;
