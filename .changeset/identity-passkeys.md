---
"@directorkit/identity": minor
---

Passkeys — optional in fact and not just in name. `usePasskey()` puts the whole WebAuthn
story behind four calls: `isAvailable`, `enrol`, `authenticate`, and `adoptSession` for a
login the app completed itself. Each returns a `Result` typed against
`PasskeyErrorResults` rather than throwing, so a caller handles outcomes by code instead
of by string-matching an exception.

Cancellation is one of those outcomes rather than a failure. The browser raises
`NotAllowedError` both when someone dismisses the prompt and when the ceremony times out
— by far the most common non-failure — so the layer reports it as `Cancelled` and leaves
the app free to say nothing at all, instead of putting a red banner in front of a person
who simply closed a dialog.

The app supplies both halves of the ceremony, so the layer assumes nothing about
endpoints or wire format: `identity.passkeyApi` for the server exchange, and
`identity.passkeyCeremony` for the browser one. `makePasskeyCeremony` lives at
`#layers/director-identity/transports/passkey` — outside `app/`, the same arrangement
`@directorkit/gql` uses for `graphql-ws`. That is what makes `@simplewebauthn/browser` a
genuinely optional peer: `<layer>/app/**` joins the consuming app's TypeScript program,
so an import in there would put the dependency in front of every consumer, including the
ones that will never register a passkey.

Covered by unit specs over the API client and the ceremony transport, and end to end
through the playground against a real virtual authenticator.
