# @directorkit/identity

## 0.3.0

### Minor Changes

- 8679107: The returning visitor is not offered a login they never lost — carried over from the app
  this layer was extracted from, where opening the site in a new tab after a break
  server-rendered "Sign in" at a signed-in user and swapped in their avatar once the page
  hydrated.

  Not a hydration bug: SSR genuinely could not resolve the session, and the chrome said so
  in the worst possible way. An access token typically dies in minutes while the refresh
  cookie lives for days, so for almost the whole life of a login a request arrives carrying
  the refresh marker alone. The plugin deliberately will not spend it — the exchange rotates
  the token, and only the browser owns the cookie jar the successor must land in — and
  leaves the session `unknown`. `isAuthorized` is `false` for both "no" and "not known yet",
  and the chrome trusted it.

  **`viewer.isSessionSettled`.** Branch on three states rather than two: hold a neutral
  placeholder in the avatar's own footprint while the session is undecided, so nothing is
  claimed and nothing reflows when the answer lands.

  **Answer versus silence, on the SSR path.** `settleAnonymousOnFailure` was swallowing two
  different failures. A token the API _rejected_ is an answer, and now settles `anonymous`
  during SSR; only a fetch that got no answer at all leaves the session `unknown` for the
  browser to retry — and no longer holds the single-flight latch shut while it does.
  Your `fetchUser` picks which one it means through its error code:
  `IsNotAuthorizedForUserData` (or `InvalidCredentials`) is a refusal, and anything else is
  read as "nothing was learned". If your "me" call cannot answer at all in some context —
  a mock that lives in the browser, a backend not reachable from SSR — say
  `ServerUnavailable` rather than a refusal, or every signed-in visitor is served a
  sign-in form.

  **The client bootstrap starts on `app:suspense:resolve`.** Settling mid-hydration made
  the first client render disagree with the server's markup, and Vue answered by rebuilding
  the chrome — the flicker the placeholder exists to remove. Anything needing the answer
  sooner calls `session.whenSettled()`, which starts the same single-flight bootstrap on
  demand.

  **The instance groups its surface by question** — `viewer` (who is asking), `permissions`
  (what they may do) and `session` (how that answer is reached and kept) — plus flat
  `login`/`logout`, the two verbs a person performs. The members drop the prefixes a flat
  namespace forced on them: `hasUserFullAccess` is `permissions.hasFullAccess`,
  `sessionStatus` is `session.status`, `_keepAlive` is `session._keepAlive`. Call sites
  destructure out of a group, because in a component they must — Vue unwraps only top-level
  refs from `<script setup>`. `useIdentityInstance()` now warns in dev when called on an app
  that already has one: each call builds another refresh timer and another set of wake
  listeners, outside any component scope, and nothing disposes them.

  **`SessionStatuses`, `SessionExpiredReasons`, `SessionRecoveryOutcomes`** are const-object
  enums rather than bare unions, so a typo is a compile error instead of a comparison that
  is quietly always false. `session.expiredReason` is now on the instance beside the status.

  **`errors/identityError.ts`**: an abstract `IdentityError` with a `kind`, replacing the
  bare `throw new Error` calls. `instanceof IdentityError` catches the layer, `kind`
  switches inside it, and each subclass carries a name a minifier cannot take away —
  `IdentityInstanceMissingError`, `IdentityNotConfiguredError` (with the `app.config` key it
  wants) and `TokenRefreshFailedError` (with the transport code).

  **`session/bootstrapPlan.ts`**: the cookies-to-branch decision was inline in the plugin,
  which made the most consequential decision on every server-rendered page reachable only
  through a built app, a browser and a mock backend. It is a pure function of two booleans,
  and now has the matrix spelled out as a spec.

  Migrating: read `identity.viewer.*`, `identity.permissions.*` and `identity.session.*`
  where the flat members used to be; `login` and `logout` are unmoved.

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
