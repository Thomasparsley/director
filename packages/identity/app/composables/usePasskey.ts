import type { Result } from "#layers/director-common/app/types/result";

import { PasskeyErrorResults } from "../errors/passkeyErrors";
import type { PasskeyAssertionResponse } from "../types/passkeyApi";

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

  return { isAvailable, enrol, authenticate };
}

/** What the app posts to its own login endpoint to turn a signature into a session. */
export interface PasskeyAssertion {
  challengeId: string
  assertionResponse: PasskeyAssertionResponse
}
