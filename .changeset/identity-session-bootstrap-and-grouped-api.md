---
"@directorkit/identity": minor
---

The returning visitor is not offered a login they never lost — carried over from the app
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
different failures. A token the API *rejected* is an answer, and now settles `anonymous`
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
