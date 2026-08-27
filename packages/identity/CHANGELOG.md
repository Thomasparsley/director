# @directorkit/identity

## 0.2.0

### Minor Changes

- 810211b: A refused login says which refusal it was, carried over from the app this layer was
  extracted from, where "the login failed" turned out to be four different situations
  wearing one sentence.

  **Four codes where there was one.** `LoginErrorResults` gains `TooManyAttempts`,
  `TooManyRequests`, `ServerUnavailable` and `RequestTimedOut`. The timeout mattered most:
  `AbortSignal.timeout` rejects exactly the way a refused connection does, so a request
  that went out and was not answered became `FailedToSendLoginRequest` — sending a user
  whose network is fine to go and look at their network. A 5xx and a 429 were both
  `FailedToLogin`, though the right next move differs: come back later, or wait a minute.

  **A rate limit says which limit and how long.** The failed arm of every login-family
  result is now a `LoginFailure` — the plain `{ success: false, error }` pair widened with
  optional detail — so `result.error` is still the code every existing call site compares,
  and `result.retryAfterSeconds` sits beside it when the server named a number. The layer
  reads it from a JSON 429 body (`{ scope, retryAfterSeconds }`, the shipped contract's
  shape) and falls back to a standard `Retry-After` header, seconds or HTTP-date, for a
  backend that only sets that. `scope` separates a login limiter from one counting every
  request from the address: the second can refuse a _first_ attempt, so "too many login
  attempts" would be the wrong sentence. An unreadable 429 — a proxy, a CDN, an older
  backend — keeps the endpoint's own meaning rather than guessing.

  **The challenge legs stop blaming the challenge.** Backends commonly put `/challenge/*`
  on the login endpoint's rate-limit partition, where an MFA login spends two permits per
  attempt, so a rate-limited code submission fell through to `ChallengeExpired`: the user
  restarted from the password form, spent two more permits, and was refused again. A 429
  is now `TooManyAttempts`, a 5xx is `ServerUnavailable`, and a timeout is told apart from
  a connection that never opened. `InvalidMfaCode` also carries the `remainingAttempts`
  the response has always contained and the mapping used to throw away, so a dialog can
  count down instead of letting someone find the limit by hitting it.

  **A rate-limited passkey login no longer reads as a broken passkey.** Both passkey legs
  sit behind the same partition, and every non-2xx collapsed into `Rejected` — which is
  how a person who believes their passkey is broken deletes a perfectly good one.
  `PasskeyErrorResults` gains `RateLimited`, `GloballyRateLimited` and `ServerUnavailable`,
  and a passkey failure carries `retryAfterSeconds` too.

  Nothing that reads `result.error` has to change. What is new is the field beside it, and
  `fetchUser` in `IdentityApi` now returns a `LoginResult<IdentityUser>` — structurally the
  same `Result` it always returned, with room for the detail an app's own `me` call can now
  pass on.

### Patch Changes

- 09af447: Three fixes carried over from the app this layer was extracted from, where they were
  found in production.

  **A dead access token on wake is recovered, not mourned.** The wake resync settled the
  session as `expired` the moment it found the access token gone or past its expiry —
  even though the refresh cookie sitting next to it says the session is alive for another
  month, and even though bootstrap already knows how to trade that cookie for a new token
  on the browser-restart path. On a phone that is the common case, not the edge one: hide
  the browser for twenty minutes, come back, and a perfectly good session asked for the
  password again. `resync()` now runs the same refresh-token exchange before giving up,
  and only a backend that refuses it ends the session. The two endings are told apart by
  their reason — `wake-expired` when there was no refresh session left to try,
  `wake-recovery-failed` when the exchange was refused — so an app can say which happened.
  A network failure ends nothing: `unreachable` is not an answer, so the session is left
  exactly as it was and the next wake event tries again. Recovery is single-flight
  (`visibilitychange` and `focus` routinely fire together) and does not consult the idle
  gate: a token that is already dead is not a live session being silently extended.
  `pageshow` joins visibility/focus/online as a wake trigger, which is how a page returning
  from the bfcache announces itself.

  `createTokenLifecycle` takes the two new seams as optional deps, so a lifecycle built
  without them behaves exactly as it did before.

  **The permission scope chain accepts a fragment that stops one level down.** A GraphQL
  selection spells the chain out to a fixed depth, so the inner node is a narrower type
  than the outer one and the old `T extends PermissionScope<T>` constraint rejected the
  exact shape a server sends. The interface recurses through itself now, and takes a chain
  of any depth, complete or cut short.

  **`scopeChainHasAnyPermission` joins `scopeChainSatisfies` in the identity core.** A
  backend that answers a scoped query with a derived row — one carrying no permissions of
  its own, with the real grant hanging off `inheritsFrom` — makes a shell that reads
  `scope.permissions` conclude "no grant at all" and throw 403 at someone who owns the
  parent scope. The new helper answers the coarse "may this reader be here?" question by
  walking the chain, the way the fine-grained check already did.

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
