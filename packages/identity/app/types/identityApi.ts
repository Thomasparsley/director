import type { Result } from "#layers/director-common/app/types/result";

import type { LoginErrorResults, RefreshErrorResults } from "../errors/identityApiErrors";
import type {
  ConsumeChallengeResult,
  CreateStepUpChallengeResult,
  LoginCredentialsRequest,
  LoginResponseResult,
  RefreshTokenResponse,
  ValidateAndConsumeChallengeResult,
  ValidateChallengeResult,
} from "./api";
import type { IdentityUser } from "./user";

/**
 * The seam between the layer and the app's backend: every project supplies its own
 * implementation via `app.config` (`identity.api`), because every project's API looks
 * different. The session state machine only ever calls these four operations — how
 * they are transported (REST, GraphQL, a mock) is the implementer's business.
 *
 * `makeIdentityApiClient` ships a REST implementation of the three token operations
 * for backends that follow the default `/login`, `/token-refresh`, `/logout` contract;
 * spread it and add `fetchUser` to compose a full `IdentityApi`.
 */
export interface IdentityApi extends IdentityTokenApi {
  /**
   * Fetches the currently-authenticated user (the "me" call). Kept separate from the
   * token operations because it typically speaks the app's data transport, not the
   * identity REST endpoints.
   */
  fetchUser: () => Promise<Result<IdentityUser, LoginErrorResults>>
}

/** The token-lifecycle subset of {@link IdentityApi}, as implemented by `makeIdentityApiClient`. */
export interface IdentityTokenApi {
  sendLoginRequest: (credentials: LoginCredentialsRequest) => Promise<LoginResponseResult>
  sendRefreshAccessTokenRequest: () => Promise<Result<RefreshTokenResponse, RefreshErrorResults>>
  sendLogoutRequest: () => Promise<void>
}

/**
 * Optional companion interface for MFA / step-up challenge flows. Configure it via
 * `app.config` (`identity.challengeApi`) when the backend supports challenges;
 * `useIdentityChallenge` throws a descriptive error when it is missing.
 */
export interface IdentityChallengeApi {
  sendCreateStepUpChallengeRequest: (purpose: string) => Promise<CreateStepUpChallengeResult>
  sendValidateChallengeRequest: (challengeId: string, code: string) => Promise<ValidateChallengeResult>
  sendConsumeChallengeRequest: (challengeId: string) => Promise<ConsumeChallengeResult>
  sendValidateAndConsumeChallengeRequest: (challengeId: string, code: string) => Promise<ValidateAndConsumeChallengeResult>
}
