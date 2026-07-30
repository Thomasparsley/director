import { executeRequest, parseJsonResponse } from "../api/request";
import { PasskeyErrorResults } from "../errors/passkeyErrors";
import type {
  IdentityPasskeyApi,
  PasskeyAssertionOptions,
  PasskeyChallenge,
  PasskeyRegistrationOptions,
  PasskeyRegistrationResponse,
} from "../types/passkeyApi";
import type { Result } from "#layers/director-common/app/types/result";

import { HttpStatusCode } from "./httpStatusCodes";
import { noopIdentityLogger } from "./logger";
import type { IdentityLogger } from "./logger";

import type { IdentityApiFetcher } from "./identityApi";

export interface PasskeyApiClientDeps {
  fetcher?: IdentityApiFetcher
  logger?: IdentityLogger
}

/**
 * The paths `Director.Identity.WebAuthn` maps, relative to the same base the identity
 * client uses. Fixed on both sides: a server that renamed one would have a client that
 * silently does nothing.
 */
function makePasskeyEndpointUrls(baseUrl: string) {
  return {
    registerOptions: `${baseUrl}/passkey/register/options`,
    registerComplete: `${baseUrl}/passkey/register/complete`,
    loginOptions: `${baseUrl}/passkey/login/options`,
  } as const;
}

/**
 * The shipped REST implementation of {@link IdentityPasskeyApi}.
 *
 * Note what is absent: there is no `sendLoginCompleteRequest`. Finishing a passkey login
 * means minting tokens and opening a session, which is the application's own login flow —
 * the same one the password path goes through. The server package leaves that route to the
 * application for exactly that reason, so this client has none to call.
 */
export function makePasskeyApiClient(baseUrl: string, deps?: PasskeyApiClientDeps): IdentityPasskeyApi {
  const logger = deps?.logger ?? noopIdentityLogger;
  const urls = makePasskeyEndpointUrls(baseUrl);
  const fetcher = deps?.fetcher ?? executeRequest;

  /**
   * Sends, and classifies the answer. `parse` is what separates the two shapes of success here:
   * a route that returns a challenge has a body to read, and one that only says "done" does not.
   * Insisting on JSON from the second turned a 200 into a refusal — an enrolment that had already
   * been stored server-side reported as failed, which is the worst possible way to be wrong.
   */
  async function post<T>(
    url: string,
    body: unknown,
    parse: boolean,
  ): Promise<Result<T, PasskeyErrorResults>> {
    let response: Response;

    try {
      response = await fetcher(url, { method: "POST", body: JSON.stringify(body) });
    }
    catch (error) {
      // Never sent: offline, timed out, refused before it reached anything. Separate from
      // a refusal, because retrying is reasonable here and pointless there.
      logger.debug(`Passkey request to ${url} failed to send: ${String(error)}`);

      return { success: false, error: PasskeyErrorResults.FailedToSendRequest };
    }

    if (response.status === HttpStatusCode.Unauthorized) {
      return { success: false, error: PasskeyErrorResults.Unauthorized };
    }

    if (!response.ok) {
      return { success: false, error: PasskeyErrorResults.Rejected };
    }

    if (!parse) {
      return { success: true, value: undefined as T };
    }

    const parsed = await parseJsonResponse<T>(response);

    return parsed === null
      ? { success: false, error: PasskeyErrorResults.Rejected }
      : { success: true, value: parsed };
  }

  return {
    sendRegisterOptionsRequest: () =>
      post<PasskeyChallenge<PasskeyRegistrationOptions>>(urls.registerOptions, {}, true),

    // No body on the way back: the server has stored the credential and has nothing to say
    // about it, so a 200 is the whole answer.
    sendRegisterCompleteRequest: (challengeId, response: PasskeyRegistrationResponse) =>
      post<void>(urls.registerComplete, { challengeId, attestationResponse: response }, false),

    sendLoginOptionsRequest: (username?: string) =>
      post<PasskeyChallenge<PasskeyAssertionOptions>>(urls.loginOptions, { username }, true),
  };
}
