import { executeRequest, parseJsonResponse } from "../api/request";
import { ChallengeErrors } from "../errors/identityApiErrors";
import type {
  ChallengeLoginOkResponse,
  ConsumeChallengeResult,
  CreateStepUpChallengeResponse,
  CreateStepUpChallengeResult,
  ValidateAndConsumeChallengeResult,
  ValidateChallengeResult,
} from "../types/api";
import type { IdentityChallengeApi } from "../types/identityApi";

import { HttpStatusCode } from "./httpStatusCodes";
import { noopIdentityLogger } from "./logger";
import type { IdentityLogger } from "./logger";

export type IdentityChallengeFetcher = typeof executeRequest;

export interface IdentityChallengeApiClientDeps {
  fetcher?: IdentityChallengeFetcher
  logger?: IdentityLogger
}

function makeChallengeEndpointUrls(baseUrl: string) {
  return {
    mfa: `${baseUrl}/challenge/mfa`,
    validate: `${baseUrl}/challenge/validate`,
    consume: `${baseUrl}/challenge/consume`,
    validateAndConsume: `${baseUrl}/challenge/validate-and-consume`,
  } as const;
}

/**
 * The shipped REST implementation of {@link IdentityChallengeApi}, for backends that
 * follow the `/challenge/*` contract.
 */
export function makeIdentityChallengeApiClient(baseUrl: string, deps?: IdentityChallengeApiClientDeps): IdentityChallengeApi {
  const logger = deps?.logger ?? noopIdentityLogger;
  const urls = makeChallengeEndpointUrls(baseUrl);
  const fetcher = deps?.fetcher ?? executeRequest;

  async function sendCreateStepUpChallengeRequest(purpose: string): Promise<CreateStepUpChallengeResult> {
    logger.debug(`Sending create step-up challenge to ${urls.mfa}`);

    let response: Response;
    try {
      response = await fetcher(urls.mfa, {
        method: "post",
        body: JSON.stringify({ purpose }),
      });
    }
    catch (error) {
      logger.error("Failed to send create step-up challenge request", error);
      return { success: false, error: ChallengeErrors.networkError() };
    }

    switch (response.status) {
      case HttpStatusCode.Ok: {
        const body = await parseJsonResponse<CreateStepUpChallengeResponse>(response);
        if (!body) {
          logger.error("Failed to parse create step-up challenge OK response");
          return { success: false, error: ChallengeErrors.challengeFailed() };
        }
        logger.log("Step-up challenge created", body.challengeId);
        return { success: true, value: body };
      }

      // 409 Conflict — the user has no MFA method configured.
      case HttpStatusCode.Conflict:
        logger.warn("Step-up challenge rejected: no MFA configured");
        return { success: false, error: ChallengeErrors.challengeFailed() };

      // Step-up is an authenticated-only endpoint, so a 401 means the session is gone,
      // not that a code ran out of time. `challengeFailed` at least does not tell the
      // user their challenge expired when they are simply signed out.
      case HttpStatusCode.Unauthorized:
        logger.warn("Step-up challenge rejected: not authenticated");
        return { success: false, error: ChallengeErrors.challengeFailed() };

      default:
        logger.warn(`Create step-up challenge failed with status ${response.status}`);
        return { success: false, error: ChallengeErrors.challengeExpired() };
    }
  }

  async function sendValidateChallengeRequest(
    challengeId: string,
    code: string,
  ): Promise<ValidateChallengeResult> {
    logger.debug(`Sending validate challenge to ${urls.validate}`);

    let response: Response;
    try {
      response = await fetcher(urls.validate, {
        method: "post",
        body: JSON.stringify({ challengeId, code }),
      });
    }
    catch (error) {
      logger.error("Failed to send validate challenge request", error);
      return { success: false, error: ChallengeErrors.networkError() };
    }

    switch (response.status) {
      case HttpStatusCode.Ok:
        logger.log("Challenge validated", challengeId);
        return { success: true, value: { challengeId } };

      case HttpStatusCode.Conflict:
        logger.warn("Challenge already validated", challengeId);
        return { success: false, error: ChallengeErrors.alreadyValidated() };

      case HttpStatusCode.Unauthorized: {
        // ProblemDetails extensions are serialized at root level
        const body = await parseJsonResponse<{ remainingAttempts?: number }>(response);
        if (body?.remainingAttempts !== undefined) {
          logger.warn(`Invalid MFA code, ${body.remainingAttempts} attempts remaining. ChallengeId: ${challengeId}`);
          return { success: false, error: ChallengeErrors.invalidCode(body.remainingAttempts) };
        }
        logger.warn("Challenge exhausted or unauthorized", challengeId);
        return { success: false, error: ChallengeErrors.challengeFailed() };
      }

      default:
        logger.warn(`Validate challenge failed with status ${response.status}`, challengeId);
        return { success: false, error: ChallengeErrors.challengeExpired() };
    }
  }

  async function sendConsumeChallengeRequest(
    challengeId: string,
  ): Promise<ConsumeChallengeResult> {
    logger.debug(`Sending consume challenge to ${urls.consume}`);

    let response: Response;
    try {
      response = await fetcher(urls.consume, {
        method: "post",
        body: JSON.stringify({ challengeId }),
      });
    }
    catch (error) {
      logger.error("Failed to send consume challenge request", error);
      return { success: false, error: ChallengeErrors.networkError() };
    }

    switch (response.status) {
      case HttpStatusCode.Ok: {
        const body = await parseJsonResponse<ChallengeLoginOkResponse>(response);
        if (!body) {
          logger.error("Failed to parse consume challenge OK response");
          return { success: false, error: ChallengeErrors.challengeFailed() };
        }
        logger.log("Challenge consumed, token issued", challengeId);
        return { success: true, value: body };
      }

      case HttpStatusCode.Conflict:
        // Same as its two siblings: the challenge was already spent, which is not the
        // same thing as expired — the UI should say so rather than blame the clock.
        logger.warn("Challenge already validated", challengeId);
        return { success: false, error: ChallengeErrors.alreadyValidated() };

      case HttpStatusCode.Unauthorized:
        logger.warn("Consume challenge unauthorized (not validated or user not found)", challengeId);
        return { success: false, error: ChallengeErrors.challengeFailed() };

      default:
        logger.warn(`Consume challenge failed with status ${response.status}`, challengeId);
        return { success: false, error: ChallengeErrors.challengeExpired() };
    }
  }

  async function sendValidateAndConsumeChallengeRequest(
    challengeId: string,
    code: string,
  ): Promise<ValidateAndConsumeChallengeResult> {
    logger.debug(`Sending validate-and-consume challenge to ${urls.validateAndConsume}`);

    let response: Response;
    try {
      response = await fetcher(urls.validateAndConsume, {
        method: "post",
        body: JSON.stringify({ challengeId, code }),
      });
    }
    catch (error) {
      logger.error("Failed to send validate-and-consume challenge request", error);
      return { success: false, error: ChallengeErrors.networkError() };
    }

    switch (response.status) {
      case HttpStatusCode.Ok: {
        const body = await parseJsonResponse<ChallengeLoginOkResponse>(response);
        if (!body) {
          logger.error("Failed to parse validate-and-consume OK response");
          return { success: false, error: ChallengeErrors.challengeFailed() };
        }
        logger.log("Challenge validated and consumed, token issued", challengeId);
        return { success: true, value: body };
      }

      case HttpStatusCode.Conflict:
        logger.warn("Challenge already validated", challengeId);
        return { success: false, error: ChallengeErrors.alreadyValidated() };

      case HttpStatusCode.Unauthorized: {
        // ProblemDetails extensions are serialized at root level
        const body = await parseJsonResponse<{ remainingAttempts?: number }>(response);
        if (body?.remainingAttempts !== undefined) {
          logger.warn(`Invalid MFA code, ${body.remainingAttempts} attempts remaining. ChallengeId: ${challengeId}`);
          return { success: false, error: ChallengeErrors.invalidCode(body.remainingAttempts) };
        }
        logger.warn("Challenge exhausted or unauthorized", challengeId);
        return { success: false, error: ChallengeErrors.challengeFailed() };
      }

      default:
        logger.warn(`Validate-and-consume challenge failed with status ${response.status}`, challengeId);
        return { success: false, error: ChallengeErrors.challengeExpired() };
    }
  }

  return {
    sendCreateStepUpChallengeRequest,
    sendValidateChallengeRequest,
    sendConsumeChallengeRequest,
    sendValidateAndConsumeChallengeRequest,
  } as const;
}
