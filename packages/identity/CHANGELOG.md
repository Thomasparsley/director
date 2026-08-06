# @directorkit/identity

## 0.1.1

### Patch Changes

- No code changes — this release fixes three things about the published artifacts that
  0.1.0 got wrong, none of which could be corrected in place.

  **Internal dependencies are caret ranges instead of exact pins.** 0.1.0 declared
  `"@directorkit/common": "0.1.0"`, so a consumer holding two layers from different
  releases would install two copies of `common` — and two Nuxt layers both named
  `director-common` then compete for the same `#layers/director-common` alias. They now
  resolve as `^0.1.1` and dedupe across the 0.1.x line.

  **Packages are published with provenance.** 0.1.0 shipped unattested: the release
  workflow set `NPM_CONFIG_PROVENANCE`, which pnpm does not forward to the npm CLI, so
  the setting did nothing and nobody noticed until the registry was checked afterwards.
  It now lives in each package's `publishConfig`, which pnpm reads directly.

  **READMEs appear on the npm package pages.** They shipped inside the 0.1.0 tarballs but
  never reached the registry metadata that npmjs.com renders from, because pnpm stopped
  sending it — a regression pnpm fixed in 11.13. The repo's pnpm floor moved to 11.20.

- Updated dependencies
  - @directorkit/common@0.1.1

## 0.1.0

### Minor Changes

- 4772a29: Passkeys — optional in fact and not just in name. `usePasskey()` puts the whole WebAuthn
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

- 68dffe0: First public release. The `@directorkit/*` layers now publish to npm under the MIT
  license (ADR-0020): every package carries its own README and npm metadata, and the
  `postinstall: nuxt prepare` hook — which would have run inside every consumer's
  `node_modules` — is now a root-level `dev:prepare`.

### Patch Changes

- Updated dependencies [68dffe0]
- Updated dependencies [68dffe0]
  - @directorkit/common@0.1.0
