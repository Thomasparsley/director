import { executeRequest, parseJsonResponse } from "../api/request";
import { LoginErrorResults, RefreshErrorResults } from "../errors/identityApiErrors";
import type {
  LoginCredentialsRequest,
  LoginMfaRequiredResponse,
  LoginOkResponse,
  LoginResponseResult,
  RefreshTokenResponse,
} from "../types/api";
import type { IdentityTokenApi } from "../types/identityApi";
import type { Result } from "#layers/director-common/app/types/result";

import { HttpStatusCode } from "./httpStatusCodes";
import { noopIdentityLogger } from "./logger";
import type { IdentityLogger } from "./logger";

export type IdentityApiFetcher = typeof executeRequest;

export interface IdentityApiClientDeps {
  fetcher?: IdentityApiFetcher
  logger?: IdentityLogger
}

function makeIdentityApiEndpointUrls(baseUrl: string) {
  return {
    login: `${baseUrl}/login`,
    tokenRefresh: `${baseUrl}/token-refresh`,
    logout: `${baseUrl}/logout`,
  } as const;
}

/**
 * The shipped REST implementation of {@link IdentityTokenApi}, for backends that
 * follow the `/login`, `/token-refresh`, `/logout` contract with httpOnly token
 * cookies. An app whose backend matches spreads this into its `identity.api`
 * factory and only writes `fetchUser` itself.
 */
export function makeIdentityApiClient(baseUrl: string, deps?: IdentityApiClientDeps): IdentityTokenApi {
  const logger = deps?.logger ?? noopIdentityLogger;
  const urls = makeIdentityApiEndpointUrls(baseUrl);
  const fetcher = deps?.fetcher ?? executeRequest;

  async function sendLoginRequest(
    credentials: LoginCredentialsRequest,
  ): Promise<LoginResponseResult> {
    logger.debug(`Sending login request to ${urls.login}`);

    let response: Response;
    try {
      response = await fetcher(urls.login, {
        method: "post",
        body: JSON.stringify(credentials),
      });
    }
    catch (error) {
      logger.error(`Failed to send login request to ${urls.login}`, error);
      return { success: false, error: LoginErrorResults.FailedToSendLoginRequest };
    }

    switch (response.status) {
      case HttpStatusCode.Ok: {
        const body = await parseJsonResponse<Omit<LoginOkResponse, "status">>(response);
        if (!body) {
          logger.error("Failed to parse login OK response");
          return { success: false, error: LoginErrorResults.FailedToLogin };
        }
        logger.log("Login successful", body);
        return {
          success: true,
          // `status` last: the body is unvalidated wire data, and a backend that
          // echoes its own `status` field must not overwrite the discriminant the
          // LoginResponseResult union narrows on.
          value: { ...body, status: "OK" } satisfies LoginOkResponse,
        };
      }

      case HttpStatusCode.Unauthorized: {
        // ProblemDetails extensions are serialized at root level
        const problem = await parseJsonResponse<{ mfaType?: string, challengeId?: string }>(response);
        if (problem?.mfaType && problem?.challengeId) {
          logger.log("Login requires MFA", problem.mfaType);
          return {
            success: true,
            value: {
              status: "MFA_REQUIRED",
              mfaType: problem.mfaType,
              challengeId: problem.challengeId,
            } satisfies LoginMfaRequiredResponse,
          };
        }
        logger.warn("Login rejected: invalid credentials");
        return { success: false, error: LoginErrorResults.InvalidCredentials };
      }

      case HttpStatusCode.BadRequest:
        logger.warn("Login rejected: invalid request");
        return { success: false, error: LoginErrorResults.InvalidCredentials };

      default:
        logger.error(`Login failed with unexpected status ${response.status}`, response);
        return { success: false, error: LoginErrorResults.FailedToLogin };
    }
  }

  async function sendRefreshAccessTokenRequest(): Promise<Result<RefreshTokenResponse, RefreshErrorResults>> {
    let response: Response;
    try {
      response = await fetcher(urls.tokenRefresh, { method: "post" });
    }
    catch (error) {
      logger.error("Failed to send token refresh request", error);
      return { success: false, error: RefreshErrorResults.FailedToSendRequest };
    }

    switch (response.status) {
      case HttpStatusCode.Ok: {
        const body = await parseJsonResponse<RefreshTokenResponse>(response);
        if (!body) {
          logger.error("Failed to parse token refresh response");
          return { success: false, error: RefreshErrorResults.FailedToRefresh };
        }
        return { success: true, value: body };
      }

      case HttpStatusCode.Unauthorized:
        logger.warn("Token refresh rejected: unauthorized");
        return { success: false, error: RefreshErrorResults.Unauthorized };

      default:
        logger.error(`Token refresh failed with unexpected status ${response.status}`);
        return { success: false, error: RefreshErrorResults.FailedToRefresh };
    }
  }

  async function sendLogoutRequest(): Promise<void> {
    await fetcher(urls.logout, { method: "post" });
  }

  return {
    sendLoginRequest,
    sendRefreshAccessTokenRequest,
    sendLogoutRequest,
  } as const;
}
