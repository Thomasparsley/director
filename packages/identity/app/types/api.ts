import type { Result } from "#layers/director-common/app/types/result";

import type { ChallengeError, LoginResult } from "../errors/identityApiErrors";

// Login with credentials (an MFA code is never submitted here — it goes through the
// challenge flow instead).
export type LoginCredentialsRequest = (
  { username: string } | { email: string }
) & {
  password: string
};

export type LoginOkResponse = {
  status: "OK"
  /** The token's server-side expiry; the client renews shortly before this instant. */
  refreshAfter: string
};

export type LoginMfaRequiredResponse = {
  status: "MFA_REQUIRED"
  mfaType: string
  challengeId: string
};

/**
 * The failed arm carries the optional detail (`retryAfterSeconds`) alongside the code —
 * see `LoginFailure` in `errors/identityApiErrors.ts`.
 */
export type LoginResponseResult = LoginResult<LoginOkResponse | LoginMfaRequiredResponse>;

export interface RefreshTokenResponse {
  readonly refreshAfter: string
}

// Challenge — validate an MFA code (two-step flow: validate then consume separately)
export type ValidateChallengeRequest = { challengeId: string, code: string };
export type ValidateChallengeResponse = { challengeId: string };
export type ValidateChallengeResult = Result<ValidateChallengeResponse, ChallengeError>;

// Challenge — consume a validated challenge to obtain a token (two-step flow)
export type ConsumeChallengeRequest = { challengeId: string };
export type ChallengeLoginOkResponse = { refreshAfter: string };
export type ConsumeChallengeResult = Result<ChallengeLoginOkResponse, ChallengeError>;

// Challenge — validate + consume in a single request (preferred for the MFA login step)
export type ValidateAndConsumeChallengeRequest = { challengeId: string, code: string };
export type ValidateAndConsumeChallengeResult = Result<ChallengeLoginOkResponse, ChallengeError>;

// Challenge — authenticated step-up: create an MFA challenge for the current user
export type CreateStepUpChallengeResponse = { challengeId: string, mfaType: string };
export type CreateStepUpChallengeResult = Result<CreateStepUpChallengeResponse, ChallengeError>;
