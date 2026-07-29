import type { Result } from "#layers/director-common/app/types/result";

import { LoginErrorResults } from "../errors/identityApiErrors";
import { useSessionStore } from "../session/store";

import { useIdentityAuthentication } from "./useIdentityAuthentication";
import { useIdentityRuntime } from "./useIdentityRuntime";

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
  ): Promise<Result<"OK", LoginErrorResults>> {
    const result = await api.sendValidateAndConsumeChallengeRequest(challengeId, code);

    if (!result.success) {
      logger.warn("MFA challenge completion failed", result.error.kind);
      switch (result.error.kind) {
        case "ChallengeExpired":
        case "AlreadyValidated":
          return { success: false, error: LoginErrorResults.ChallengeExpired };
        case "InvalidCode":
          return { success: false, error: LoginErrorResults.InvalidMfaCode };
        default:
          return { success: false, error: LoginErrorResults.MfaChallengeFailed };
      }
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
  async function createStepUpChallenge(purpose: string): Promise<Result<{ challengeId: string, mfaType: string }, LoginErrorResults>> {
    const result = await api.sendCreateStepUpChallengeRequest(purpose);

    if (!result.success) {
      logger.warn("Step-up challenge creation failed", result.error.kind);
      return { success: false, error: LoginErrorResults.MfaChallengeFailed };
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
  ): Promise<Result<"OK", LoginErrorResults>> {
    const result = await api.sendValidateChallengeRequest(challengeId, code);

    if (!result.success) {
      logger.warn("Step-up MFA validation failed", result.error.kind);
      switch (result.error.kind) {
        case "ChallengeExpired":
        case "AlreadyValidated":
          return { success: false, error: LoginErrorResults.ChallengeExpired };
        case "InvalidCode":
          return { success: false, error: LoginErrorResults.InvalidMfaCode };
        default:
          return { success: false, error: LoginErrorResults.MfaChallengeFailed };
      }
    }

    logger.log("Step-up MFA challenge validated", challengeId);
    return { success: true, value: "OK" };
  }

  return { completeMfaChallenge, createStepUpChallenge, completeStepUpChallenge };
}
