import { RateLimitScopes } from "../api/rateLimit";
import { LoginErrorResults } from "../errors/identityApiErrors";
import type { ChallengeError, LoginFailure, LoginResult } from "../errors/identityApiErrors";
import { useSessionStore } from "../session/store";

import { useIdentityAuthentication } from "./useIdentityAuthentication";
import { useIdentityRuntime } from "./useIdentityRuntime";

/**
 * The failures that are about the *transport*, not about the challenge — the request was
 * refused, broke, timed out or never left. None of them says anything about the code the
 * user typed, so none of them may be reported as an expired challenge: that answer sends
 * someone back to the password form to spend more of the rate-limit budget that just ran
 * out. Returns `undefined` for anything that *is* about the challenge, which each caller
 * then reads in its own terms.
 */
function transportFailure(error: ChallengeError): LoginFailure | undefined {
  switch (error.kind) {
    case "RateLimited":
      return {
        success: false,
        error: error.scope === RateLimitScopes.Global
          ? LoginErrorResults.TooManyRequests
          : LoginErrorResults.TooManyAttempts,
        retryAfterSeconds: error.retryAfterSeconds,
      };
    case "ServerUnavailable":
      return { success: false, error: LoginErrorResults.ServerUnavailable };
    case "RequestTimedOut":
      return { success: false, error: LoginErrorResults.RequestTimedOut };
    case "NetworkError":
      return { success: false, error: LoginErrorResults.FailedToSendLoginRequest };
    default:
      return undefined;
  }
}

/**
 * How a code submission (login or step-up) failed. Both legs read the answer the same
 * way, so they share this.
 */
function toCodeSubmissionFailure(error: ChallengeError): LoginFailure {
  const transport = transportFailure(error);
  if (transport) {
    return transport;
  }

  switch (error.kind) {
    case "ChallengeExpired":
    case "AlreadyValidated":
      return { success: false, error: LoginErrorResults.ChallengeExpired };
    case "InvalidCode":
      // The count travels with the code so the app can say how many tries are left
      // instead of letting the user discover the limit by hitting it.
      return {
        success: false,
        error: LoginErrorResults.InvalidMfaCode,
        remainingAttempts: error.remainingAttempts,
      };
    default:
      return { success: false, error: LoginErrorResults.MfaChallengeFailed };
  }
}

/**
 * MFA / step-up challenge flows over the app-configured `identity.challengeApi`.
 * Throws on first use when the app has not configured a challenge API.
 */
export function useIdentityChallenge() {
  const runtime = useIdentityRuntime();
  const logger = runtime.logger("Identity:Challenge");
  const api = runtime.challengeApi;
  const { applyExpiry } = useSessionStore();
  const auth = useIdentityAuthentication();

  /**
   * Validates the MFA code and consumes the challenge in one request.
   * On success, sets the access token cookie and fetches the logged-in user.
   */
  async function completeMfaChallenge(
    challengeId: string,
    code: string,
  ): Promise<LoginResult<"OK">> {
    const result = await api.sendValidateAndConsumeChallengeRequest(challengeId, code);

    if (!result.success) {
      logger.warn("MFA challenge completion failed", result.error.kind);
      return toCodeSubmissionFailure(result.error);
    }

    applyExpiry(result.value.refreshAfter);

    const authResult = await auth.authenticate();
    if (!authResult.success) {
      return authResult;
    }

    logger.log("MFA challenge completed successfully", challengeId);
    return { success: true, value: "OK" };
  }

  /**
   * Creates an MFA step-up challenge for the already-authenticated user.
   * Returns the challenge id + type to drive the OTP dialog.
   */
  async function createStepUpChallenge(purpose: string): Promise<LoginResult<{ challengeId: string, mfaType: string }>> {
    const result = await api.sendCreateStepUpChallengeRequest(purpose);

    if (!result.success) {
      logger.warn("Step-up challenge creation failed", result.error.kind);
      // No challenge exists yet, so nothing here can have "expired": every non-transport
      // outcome is the step-up simply not starting.
      return transportFailure(result.error)
        ?? { success: false, error: LoginErrorResults.MfaChallengeFailed };
    }

    return { success: true, value: result.value };
  }

  /**
   * Validates the MFA code for a step-up challenge WITHOUT consuming it / issuing a
   * token. The validated challenge is later consumed server-side by the action it
   * authorizes (e.g. unlock).
   */
  async function completeStepUpChallenge(
    challengeId: string,
    code: string,
  ): Promise<LoginResult<"OK">> {
    const result = await api.sendValidateChallengeRequest(challengeId, code);

    if (!result.success) {
      logger.warn("Step-up MFA validation failed", result.error.kind);
      return toCodeSubmissionFailure(result.error);
    }

    logger.log("Step-up MFA challenge validated", challengeId);
    return { success: true, value: "OK" };
  }

  return { completeMfaChallenge, createStepUpChallenge, completeStepUpChallenge };
}
