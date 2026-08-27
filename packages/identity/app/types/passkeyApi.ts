import type { PasskeyResult } from "../errors/passkeyErrors";

/**
 * The two option payloads, as the server hands them over.
 *
 * Typed as opaque records rather than modelled field by field, on purpose. They are
 * produced by the server's WebAuthn library and consumed by the browser's — nothing in
 * this layer reads a field, and a partial copy of the spec here would be one more place
 * to drift when either side updates. `transports/passkey.ts` is where they are handed to
 * `@simplewebauthn/browser`, which owns the real types.
 */
export type PasskeyRegistrationOptions = Record<string, unknown>;

export type PasskeyAssertionOptions = Record<string, unknown>;

/** What the credential ceremony sends back, ready to post to the server. */
export type PasskeyRegistrationResponse = Record<string, unknown>;

export type PasskeyAssertionResponse = Record<string, unknown>;

export interface PasskeyChallenge<TOptions> {
  challengeId: string
  options: TOptions
}

/**
 * The passkey half of the identity API, configured through `app.config`
 * (`identity.passkeyApi`).
 *
 * Optional in the same way `challengeApi` is: an app that never enables passkeys does not
 * set it, and nothing about its login changes. `usePasskey` says so plainly rather than
 * failing somewhere deeper.
 */
export interface IdentityPasskeyApi {
  /** Asks the server for enrolment options. Requires an authenticated session. */
  sendRegisterOptionsRequest: () =>
  Promise<PasskeyResult<PasskeyChallenge<PasskeyRegistrationOptions>>>

  /** Hands back the signed attestation to be verified and stored. */
  sendRegisterCompleteRequest: (challengeId: string, response: PasskeyRegistrationResponse) =>
  Promise<PasskeyResult<void>>

  /**
   * Asks for assertion options.
   *
   * The username is optional, and the two shapes are different flows: with one, the
   * server names that user's credentials so an authenticator knows which to offer;
   * without, the ceremony is discoverable and the authenticator picks — the sign-in with
   * no username box at all.
   */
  sendLoginOptionsRequest: (username?: string) =>
  Promise<PasskeyResult<PasskeyChallenge<PasskeyAssertionOptions>>>
}

/**
 * The browser half of the ceremony, as the layer consumes it.
 *
 * A type here and an implementation in `transports/passkey.ts`, which is the only file that
 * touches `@simplewebauthn/browser`. The app builds one and hands it over through
 * `app.config`, exactly as `@directorkit/gql` does with `forwardSubscription` — that indirection
 * is what keeps the browser package out of every consumer's TypeScript program.
 */
export interface PasskeyCeremony {
  supportsPasskeys: () => boolean
  createPasskey: (options: PasskeyRegistrationOptions) =>
  Promise<PasskeyResult<PasskeyRegistrationResponse>>
  getPasskeyAssertion: (options: PasskeyAssertionOptions) =>
  Promise<PasskeyResult<PasskeyAssertionResponse>>
}
