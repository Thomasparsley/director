import { LoginErrorResults } from "../errors/identityApiErrors";
import type { LoginFailure, LoginResult } from "../errors/identityApiErrors";
import type { IdentityUser } from "../types/user";

import { FetchUserOutcomes } from "./types";
import type { FetchUserOutcome } from "./types";

/**
 * The codes that mean the API *answered*, and the answer was "this request
 * identifies nobody". Everything else is silence — a network error, a timeout, a
 * 5xx, a body that would not parse — and tells us nothing about the session.
 *
 * Only these two qualify because only these two are a verdict. `FailedToFetchMe`
 * deliberately is not: it is what an app returns when it could not complete the
 * call, which is the case the whole distinction exists to keep separate.
 */
const REJECTING_ERRORS: ReadonlySet<LoginErrorResults> = new Set([
  LoginErrorResults.IsNotAuthorizedForUserData,
  LoginErrorResults.InvalidCredentials,
]);

/**
 * Classifies an app's `fetchUser` result for the session machine.
 *
 * Kept out of {@link IdentityApi} on purpose: an app implements `fetchUser` with a
 * plain `LoginResult`, and the layer works out answer-versus-silence from the code
 * it chose. An app whose "me" call is refused should say
 * `IsNotAuthorizedForUserData` — that is what lets SSR settle the session anonymous
 * instead of leaving it `unknown` for the browser to redo. Any code the layer does
 * not recognise is treated as `Unavailable`, which is the conservative reading: the
 * client retries rather than painting a logged-out shell over a live session.
 */
export function classifyFetchUser(result: LoginResult<IdentityUser>): FetchUserOutcome {
  if (result.success) {
    return { status: FetchUserOutcomes.Ok, user: result.value };
  }

  const failure: LoginFailure = result;
  return {
    ...failure,
    status: REJECTING_ERRORS.has(failure.error)
      ? FetchUserOutcomes.Rejected
      : FetchUserOutcomes.Unavailable,
  };
}
