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

export const LoginErrorResults = {
  IsNotAuthorizedForUserData: "IsNotAuthorizedForUserData",
  FailedToFetchMe: "FailedToFetchMe",
  InvalidCredentials: "InvalidCredentials",
  FailedToLogin: "FailedToLogin",
  FailedToSendLoginRequest: "FailedToSendLoginRequest",
  ChallengeExpired: "ChallengeExpired",
  InvalidMfaCode: "InvalidMfaCode",
  MfaChallengeFailed: "MfaChallengeFailed",
} as const;

export type LoginErrorResults = typeof LoginErrorResults[keyof typeof LoginErrorResults];

/**
 * Discriminated-union error for challenge API operations.
 * Use the `kind` field to narrow the type.
 * `InvalidCode` carries `remainingAttempts` so the UI can display a countdown.
 */
export type ChallengeError
  = | { readonly kind: "NetworkError" }
    | { readonly kind: "ChallengeExpired" }
    | { readonly kind: "InvalidCode", readonly remainingAttempts: number }
    | { readonly kind: "ChallengeFailed" }
    | { readonly kind: "AlreadyValidated" };

export const ChallengeErrors = {
  networkError: (): ChallengeError => ({ kind: "NetworkError" }),
  challengeExpired: (): ChallengeError => ({ kind: "ChallengeExpired" }),
  invalidCode: (remainingAttempts: number): ChallengeError => ({ kind: "InvalidCode", remainingAttempts }),
  challengeFailed: (): ChallengeError => ({ kind: "ChallengeFailed" }),
  alreadyValidated: (): ChallengeError => ({ kind: "AlreadyValidated" }),
} as const;
