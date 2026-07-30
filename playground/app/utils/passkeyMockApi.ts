import type {
  IdentityPasskeyApi,
  PasskeyChallenge,
  PasskeyRegistrationOptions,
} from "#layers/director-identity/app/types/passkeyApi";

/**
 * An in-browser fake of the passkey half of an identity backend.
 *
 * The mock's job stops at the wire: it issues options that are structurally what a server
 * issues, and it accepts what comes back. It does **not** verify a signature — there is no
 * server here to hold the challenge, and a fake verifier would prove nothing.
 *
 * What the demo and its E2E do exercise is everything on this side of that line, which is
 * the layer's actual contract: that options reach `@simplewebauthn/browser` in a shape it
 * accepts, that a real authenticator's response comes back through `usePasskey`, and that a
 * dismissed prompt is reported as cancelled rather than as a failure. The signature
 * verification is tested where it belongs, against the real library, in
 * `Director.Identity.WebAuthn`'s ceremony tests.
 */
const RELYING_PARTY = { id: "localhost", name: "Director playground" };

/**
 * Both defaults, in preference order.
 *
 * ES256 alone is not enough: Chrome warns that omitting either of its two defaults "can
 * result in registration failures on incompatible authenticators", and Fido2NetLib offers
 * both. The playground's console guard caught exactly this.
 */
const ES256 = -7;
const RS256 = -257;

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function randomBase64Url(length: number): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(length)));
}

export function makePasskeyMockApi(): IdentityPasskeyApi {
  // Credential ids this "server" has seen, so a second enrolment excludes the first — the
  // same thing a real one does to stop an authenticator registering twice.
  const enrolled: Array<string> = [];

  return {
    sendRegisterOptionsRequest: async () => {
      const options: PasskeyRegistrationOptions = {
        rp: RELYING_PARTY,
        user: {
          id: randomBase64Url(16),
          name: "demo@example.com",
          displayName: "Demo User",
        },
        challenge: randomBase64Url(32),
        pubKeyCredParams: [
          { type: "public-key", alg: ES256 },
          { type: "public-key", alg: RS256 },
        ],
        timeout: 60_000,
        attestation: "none",
        excludeCredentials: enrolled.map(id => ({ id, type: "public-key" })),
        authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
      };

      return {
        success: true,
        value: { challengeId: randomBase64Url(8), options } satisfies PasskeyChallenge<PasskeyRegistrationOptions>,
      };
    },

    sendRegisterCompleteRequest: async (_challengeId, response) => {
      const id = (response as { id?: string }).id;

      if (typeof id === "string") {
        enrolled.push(id);
      }

      return { success: true, value: undefined };
    },

    sendLoginOptionsRequest: async () => ({
      success: true,
      value: {
        challengeId: randomBase64Url(8),
        options: {
          challenge: randomBase64Url(32),
          rpId: RELYING_PARTY.id,
          timeout: 60_000,
          userVerification: "preferred",
          // Empty, which is the discoverable-credential shape: the authenticator picks.
          allowCredentials: [],
        },
      },
    }),
  };
}
