import type { Result } from "#layers/director-common/app/types/result";

import { PasskeyErrorResults } from "../errors/passkeyErrors";
import type { PasskeyAssertionResponse } from "../types/passkeyApi";

import { useSessionStore } from "../session/store";

import { useIdentityAuthentication } from "./useIdentityAuthentication";
import { useIdentityRuntime } from "./useIdentityRuntime";

/**
 * Enrolling and using a passkey.
 *
 * Both flows are two round trips — ask the server for options, have the authenticator sign
 * over them, send the result back — and this joins the halves so a caller writes one call.
 *
 * What it deliberately does not do is finish a login. `authenticate` returns the signed
 * assertion and its challenge id; handing those to the server for a session is the app's
 * own login flow, the same one the password path goes through. A composable that opened
 * sessions its own way would be a second way in, differing from the first in ways nobody
 * intended.
 */
export function usePasskey() {
  const runtime = useIdentityRuntime();
  const logger = runtime.logger("Identity:Passkey");
  const auth = useIdentityAuthentication();
  const { applyExpiry } = useSessionStore();

  /**
   * Whether offering a passkey makes sense at all.
   *
   * Configuration and browser capability together, because either one missing has the same
   * consequence for the caller: do not show the button. Safe before configuration exists,
   * so a screen can ask without a try/catch.
   */
  function isAvailable(): boolean {
    return runtime.hasPasskeys && runtime.passkeyCeremony.supportsPasskeys();
  }

  /** Enrols a new passkey for the signed-in user. */
  async function enrol(): Promise<Result<void, PasskeyErrorResults>> {
    if (!runtime.hasPasskeys) {
      return { success: false, error: PasskeyErrorResults.NotConfigured };
    }

    const options = await runtime.passkeyApi.sendRegisterOptionsRequest();
    if (!options.success) {
      logger.warn("Passkey enrolment could not start", options.error);

      return options;
    }

    const signed = await runtime.passkeyCeremony.createPasskey(options.value.options);
    if (!signed.success) {
      // Cancellation lands here and is not a failure — see PasskeyErrorResults.Cancelled.
      logger.debug("Passkey ceremony did not complete", signed.error);

      return signed;
    }

    return runtime.passkeyApi.sendRegisterCompleteRequest(options.value.challengeId, signed.value);
  }

  /**
   * Runs the assertion half of a sign-in.
   *
   * @param username Omit for a discoverable login — no username box, the authenticator picks.
   */
  async function authenticate(username?: string): Promise<Result<PasskeyAssertion, PasskeyErrorResults>> {
    if (!runtime.hasPasskeys) {
      return { success: false, error: PasskeyErrorResults.NotConfigured };
    }

    const options = await runtime.passkeyApi.sendLoginOptionsRequest(username);
    if (!options.success) {
      logger.warn("Passkey sign-in could not start", options.error);

      return options;
    }

    const signed = await runtime.passkeyCeremony.getPasskeyAssertion(options.value.options);
    if (!signed.success) {
      logger.debug("Passkey ceremony did not complete", signed.error);

      return signed;
    }

    return {
      success: true,
      value: { challengeId: options.value.challengeId, assertionResponse: signed.value },
    };
  }

  /**
   * Takes up a session the application opened for itself.
   *
   * The counterpart to `authenticate`, and the reason that one can stop at a signature: the app
   * posts the assertion to its own endpoint, the server sets the cookies, and then the layer has
   * to be told — otherwise its session state still says anonymous, the route guard bounces the
   * very page the login just earned, and every request after it is made by a client that does not
   * know it is signed in.
   *
   * The same call serves any login the app completes itself: SSO, a magic link, anything that
   * ends in Director's cookies being set.
   *
   * @param refreshAfter The access token's expiry, as the login response reports it.
   */
  async function adoptSession(refreshAfter: string): Promise<boolean> {
    applyExpiry(refreshAfter);

    const result = await auth.authenticate();

    if (!result.success) {
      logger.warn("A session was opened but the user could not be fetched", result.error);
    }

    return result.success;
  }

  return { isAvailable, enrol, authenticate, adoptSession };
}

/** What the app posts to its own login endpoint to turn a signature into a session. */
export interface PasskeyAssertion {
  challengeId: string
  assertionResponse: PasskeyAssertionResponse
}
