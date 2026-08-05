import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

import { PasskeyErrorResults } from "../app/errors/passkeyErrors";
import type {
  PasskeyAssertionOptions,
  PasskeyAssertionResponse,
  PasskeyRegistrationOptions,
  PasskeyRegistrationResponse,
} from "../app/types/passkeyApi";
import type { PasskeyCeremony } from "../app/types/passkeyApi";
import type { Result } from "#layers/director-common/app/types/result";

/**
 * The browser half of the passkey ceremony.
 *
 * This module is the ONLY place the layer touches `@simplewebauthn/browser`, and it
 * deliberately lives OUTSIDE `app/` — the same reason, and the same precedent, as
 * `@directorkit/gql`'s `transports/graphqlWs.ts`. Nuxt puts `<layer>/app/**` into the
 * consuming app's TypeScript program, so a file in there importing this package would make
 * every consumer of `@directorkit/identity` install it just to typecheck, including apps that
 * will never register a passkey. Out here the file only joins the program of an app that
 * actually imports it, which is what makes the optional peer dependency honest.
 */

/** Whether this browser can do WebAuthn at all. False on an insecure origin, among others. */
export function supportsPasskeys(): boolean {
  return browserSupportsWebAuthn();
}

/**
 * Runs the registration ceremony over the server's options.
 *
 * The options go through untouched. They are base64url JSON as the server's library
 * produced them and as `startRegistration` expects them — this is the seam where the two
 * libraries meet, and re-encoding anything here is the most likely way to break it.
 */
export async function createPasskey(
  options: PasskeyRegistrationOptions,
): Promise<Result<PasskeyRegistrationResponse, PasskeyErrorResults>> {
  if (!browserSupportsWebAuthn()) {
    return { success: false, error: PasskeyErrorResults.Unsupported };
  }

  try {
    // The double cast is the point of this file rather than a smell: `app/` describes these
    // payloads as opaque records precisely so it never has to name a type from this package,
    // and here is the one place where the opaque thing becomes the library's own type. The
    // bytes are unchanged in both directions.
    const response = await startRegistration({
      optionsJSON: options as unknown as Parameters<typeof startRegistration>[0]["optionsJSON"],
    });

    return { success: true, value: response as unknown as PasskeyRegistrationResponse };
  }
  catch (error) {
    return { success: false, error: classify(error) };
  }
}

/** Runs the assertion ceremony. `useBrowserAutofill` is the caller's to decide, not this. */
export async function getPasskeyAssertion(
  options: PasskeyAssertionOptions,
): Promise<Result<PasskeyAssertionResponse, PasskeyErrorResults>> {
  if (!browserSupportsWebAuthn()) {
    return { success: false, error: PasskeyErrorResults.Unsupported };
  }

  try {
    const response = await startAuthentication({
      optionsJSON: options as unknown as Parameters<typeof startAuthentication>[0]["optionsJSON"],
    });

    return { success: true, value: response as unknown as PasskeyAssertionResponse };
  }
  catch (error) {
    return { success: false, error: classify(error) };
  }
}

/**
 * Telling "the user changed their mind" apart from "something broke".
 *
 * The browser raises `NotAllowedError` both when someone dismisses the prompt and when the
 * ceremony times out, and it is by far the most common outcome that is not a failure. A
 * client that reports it as an error puts a red banner in front of a person who simply
 * closed a dialog — which is the first thing every WebAuthn front end gets wrong.
 *
 * `AbortError` lands here too: it is what a caller's own cancellation produces.
 */
function classify(error: unknown): PasskeyErrorResults {
  const name = (error as { name?: string } | null)?.name;

  return name === "NotAllowedError" || name === "AbortError"
    ? PasskeyErrorResults.Cancelled
    : PasskeyErrorResults.CeremonyFailed;
}

/**
 * The three functions above as one object, for `app.config`:
 *
 * ```ts
 * identity: {
 *   passkeyCeremony: () => makePasskeyCeremony(),
 * }
 * ```
 */
export function makePasskeyCeremony(): PasskeyCeremony {
  return { supportsPasskeys, createPasskey, getPasskeyAssertion };
}
