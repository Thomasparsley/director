# @directorkit/identity

Session/auth state for Nuxt apps, as a logic-only Nuxt layer: one owner of session
state (status, user, token expiry) with pure, dependency-injected logic around it —
a session state machine, an expiry-scheduled token lifecycle with wake resync, an
idle keep-alive controller, and transport-level auth recovery.

The layer never assumes a backend. Every app supplies its own transport through the
**`IdentityApi` interface** in `app.config` — REST, GraphQL or an in-browser mock all
plug in the same way. It ships **no components, middlewares or forms**: it holds
state; painting login forms and dialogs is the consuming app's job (the same trade as
`@directorkit/dialogs`, see ADR-0017/ADR-0019).

## Install

Add the layer to the app's `extends` (and its package to the dependencies):

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ["@directorkit/identity"],
});
```

The layer's plugin boots the session automatically — but it refuses to boot (with a
dev warning) until you configure it. Adding the layer is safe but inert until then.

## Configure the plugin

All configuration lives under the `identity` key of `app.config`. Only `api` is
required; everything else has defaults. Type the entry with `satisfies
IdentityAppConfig` (the layer deliberately does not augment `nuxt/schema` — a layer
ships raw source, and augmentation does not survive being compiled by the consumer's
program):

```ts
// app/app.config.ts
import type { IdentityAppConfig } from "#layers/director-identity/app/types/appConfig";
import { makeIdentityApiClient } from "#layers/director-identity/app/utils/identityApi";

export default defineAppConfig({
  identity: {
    // REQUIRED — how this app talks to its identity backend.
    // Called lazily, once per app, inside Nuxt context (useRuntimeConfig works here).
    api: ({ logger }) => ({
      // The shipped REST client covers /login, /token-refresh and /logout…
      ...makeIdentityApiClient(useRuntimeConfig().public.identityApi, { logger }),
      // …and the app writes only the "who am I" call, in whatever transport it uses.
      fetchUser: async () => {
        const me = await fetchMeSomehow(); // REST, GraphQL, anything
        return me
          ? { success: true, value: me }
          : { success: false, error: LoginErrorResults.FailedToFetchMe };
      },
    }),
  } satisfies IdentityAppConfig,
});
```

### The `IdentityApi` interface

Your `api` factory must return an object with these four operations (see
`app/types/identityApi.ts` for the exact signatures):

| Operation | Purpose |
| --- | --- |
| `sendLoginRequest(credentials)` | Exchange credentials for a session; may answer `OK` or `MFA_REQUIRED` |
| `sendRefreshAccessTokenRequest()` | Renew the access token; `Unauthorized` means the session is dead |
| `sendLogoutRequest()` | Kill the session server-side |
| `fetchUser()` | Load the currently-authenticated user (the "me" call) |

A backend that follows the default REST contract (`/login`, `/token-refresh`,
`/logout`; httpOnly tokens plus JS-readable `has_acc_tkn` / `has_rfrsh_tkn` marker
cookies) gets the first three for free from `makeIdentityApiClient` — spread it as
above. A backend with a different shape implements the interface from scratch; the
session state machine only ever calls these four operations.

### Optional configuration

```ts
identity: {
  api: /* … */,

  // MFA / step-up challenge flows (useIdentityChallenge throws without it).
  // makeIdentityChallengeApiClient ships the default /challenge/* REST client.
  challengeApi: ({ logger }) =>
    makeIdentityChallengeApiClient(useRuntimeConfig().public.identityApi, { logger }),

  // Timing overrides, merged over defaultIdentityTiming (all values in ms):
  // refreshLeadMs, refreshMinDelayMs, refreshMaxRetries, refreshRetryBaseMs,
  // idleAfterMs, keepAliveCountdownMs, keepAliveSafetyMarginMs, requestTimeoutMs.
  timing: { idleAfterMs: 5 * 60_000 },

  // Marker-cookie names, if the backend uses different ones.
  cookies: { hasAccessToken: "has_acc_tkn", hasRefreshToken: "has_rfrsh_tkn" },

  // Where permissions live on YOUR user shape (see "Permissions" below).
  permissions: {
    hasFullAccess: user => user.role.hasFullAccess,
    permissionsOf: user => user.role.permissions,
  },

  // One logger per scope; identity is silent without it.
  logger: scope => makeMyLogger(scope),
} satisfies IdentityAppConfig,
```

### Declare your user type

The layer stores the user opaquely; declare its real shape by augmenting the
`IdentityUser` interface:

```ts
// app/types/identityUser.d.ts
declare module "#layers/director-identity/app/types/user" {
  interface IdentityUser {
    name: string
    email: string
  }
}

export {};
```

## Use it

The plugin creates one identity instance per app and provides it; read it anywhere
with the auto-imported `useIdentity()`:

The instance answers three questions, and groups its members by which one — `viewer`
(who is asking), `permissions` (what they may do) and `session` (how that answer is
reached and kept) — plus `login`/`logout`, which sit flat because they are the verbs a
person performs rather than things that happen to them.

```vue
<script setup lang="ts">
const identity = useIdentity();

// Destructure OUT of a group. In a component you must: Vue unwraps only top-level
// refs from `<script setup>`, so a `viewer.isAuthorized` reaching the template would
// render the ref object rather than the boolean.
const { user, isAuthorized, isSessionSettled } = identity.viewer;
const { hasPermission } = identity.permissions;

// Log in / out
const result = await identity.login(buildLoginCredentials(usernameOrEmail, password));
if (result.success && result.value.status === "MFA_REQUIRED") {
  // drive your MFA dialog, then complete via useIdentityChallenge()
}
await identity.logout();
</script>
```

What the instance gives you:

| Member | What it does |
| --- | --- |
| `viewer.user`, `viewer.isAuthorized` | Reactive views over the session store |
| `viewer.isSessionSettled` | `false` while the session is still `unknown` — see [Three states, not two](#three-states-not-two) |
| `permissions.hasPermission(arg)`, `permissions.useHasPermission(arg)`, `permissions.hasFullAccess` | Permission checks (see below) |
| `login(credentials)` | Login flow; resolves `OK`, `ALREADY_AUTHORIZED` or `MFA_REQUIRED` |
| `logout()` | Logs out server-side and clears local state unconditionally |
| `session.status`, `session.expiredReason`, `session.isSettled` | The state machine's own view |
| `session.whenSettled()` | Resolves once the session is no longer `unknown` — await this in route guards |
| `session.bootstrap()` | Resolves the initial session (single-flight; the plugin already calls it) |
| `session.fetchMe()` / `session.refetchMe()` | (Re)load the current user into the store |
| `session.recoverAuth()` | Wire into your data layer's auth-error hook (401 interceptor, GraphQL auth exchange) |
| `session._keepAlive` | Low-level seam behind `useIdentityKeepAlive()` (see below); not part of the public API |

Compare `SessionStatuses.Authenticated` and friends rather than the bare strings —
`session/types.ts` exports a const object per state field (`SessionStatuses`,
`SessionExpiredReasons`, `SessionRecoveryOutcomes`), so a typo is a compile error
instead of a comparison that is quietly always false.

Session bootstrap is automatic: on the server the plugin settles the session from the
incoming marker cookies before rendering; on the client it recovers "browser
restarted, refresh cookie still present" sessions and retries fetches that failed
during SSR. Silent token renewal runs while the session is authorized — scheduled by
absolute expiry, resynced on tab wake — and pauses when it is not.

A tab that comes back to a dead access token (the phone-in-pocket case: timers do not
run while the browser is suspended) does not settle as expired on the spot. The wake
resync trades the refresh cookie for a new access token first, and only a backend that
refuses the exchange ends the session — with `wake-recovery-failed` rather than
`wake-expired`, so an app can tell the two apart. A network failure ends nothing: the
session is left as it is and the next wake event tries again.

### Three states, not two

`isAuthorized` answers "is this a logged-in user?", and answers `false` for BOTH "no"
and "not known yet". Chrome that renders a logged-out state must not take that `false`
at face value.

An access token typically dies in minutes while the refresh cookie lives for days, so
the ordinary returning visitor arrives carrying the refresh marker alone. The server
deliberately will not spend it — the exchange rotates the token, and only the browser
owns the cookie jar the successor must land in — so the page is server-rendered with
the session still `unknown`. A header that trusted `isAuthorized` there paints "Sign
in" at someone who was logged in the whole time, then swaps in their avatar once
hydration corrects it.

Branch on `viewer.isSessionSettled` and hold a neutral placeholder in the avatar's own
footprint while the session is undecided: nothing is claimed, and nothing reflows when
the answer lands.

```vue
<template>
  <span v-if="!isSessionSettled" class="avatar-placeholder" />
  <UserMenu v-else-if="isAuthorized" :user="user" />
  <SignInLink v-else />
</template>
```

### Answer versus silence

Your `fetchUser` reports failure as a `LoginResult`, and **the code you choose decides
what the server is allowed to conclude**:

- `IsNotAuthorizedForUserData` (and `InvalidCredentials`) mean the API *answered*, and
  the answer is "this request identifies nobody". That settles the session `anonymous`
  — during SSR too, because it is a verdict.
- **Every other code** means no answer arrived: the backend was unreachable, the
  request timed out, the body would not parse. Nothing was learned, so SSR leaves the
  session `unknown` and the browser asks again after hydration.

Collapsing the two is what makes a stale token and an unreachable backend
indistinguishable — one settles a logged-out shell over a live session, the other
leaves the placeholder up for ever. If your "me" call cannot answer at all in a given
context, say `ServerUnavailable`; save `IsNotAuthorizedForUserData` for a real refusal.

### Why a login failed

Every login-family call resolves to a `LoginResult`, whose failed arm is a
`LoginFailure`: the `LoginErrorResults` code, plus whatever detail the server sent
beside it.

```ts
const result = await identity.login(credentials);
if (!result.success) {
  switch (result.error) {
    case LoginErrorResults.InvalidCredentials: return t("wrongPassword");
    // Two different limiters, two different sentences — the second can refuse a *first*
    // attempt, so "too many login attempts" would be the wrong thing to say.
    case LoginErrorResults.TooManyAttempts: return retryIn(result.retryAfterSeconds);
    case LoginErrorResults.TooManyRequests: return busyRetryIn(result.retryAfterSeconds);
    case LoginErrorResults.ServerUnavailable: return t("comeBackLater");
    case LoginErrorResults.RequestTimedOut: return t("noAnswer");
    default: return t("loginFailed");
  }
}
```

The codes that keep the situations apart, and what each one means for the person in
front of the form:

| Code | What actually happened |
| --- | --- |
| `TooManyAttempts` | A login limiter refused. Nothing was judged; waiting helps |
| `TooManyRequests` | A limiter counting *every* request refused — need not be about logging in at all |
| `ServerUnavailable` | 5xx: the backend or its proxy broke, and the credentials were never read |
| `RequestTimedOut` | The request went out and no answer came back |
| `FailedToSendLoginRequest` | The request never opened — the one case where "check your connection" is right |

`retryAfterSeconds` is set when the server named a number: either a JSON 429 body
(`{ scope, retryAfterSeconds }`, the shipped contract's shape, where `scope` is `login`,
`token-refresh` or `global`) or a standard `Retry-After` header, seconds or HTTP-date.
It is absent whenever a proxy, a CDN or an older backend answered instead — so every
message has to read correctly without it.

`InvalidMfaCode` carries `remainingAttempts` the same way, when the challenge response
reported one, so a dialog can count down instead of letting someone find the limit by
hitting it.

The challenge legs distinguish transport from challenge for the same reason. Backends
commonly put `/challenge/*` on the login endpoint's rate-limit partition — an MFA login
then spends two permits per attempt — so a 429 there is reported as `TooManyAttempts`,
not as `ChallengeExpired`: the latter would send the user back to the password form to
spend two more permits and be refused again.

### Route guards

The layer ships no middleware (redirect targets are app policy). Write yours against
`whenSettled()`:

```ts
// app/middleware/authenticated.ts
export default defineNuxtRouteMiddleware(async () => {
  const identity = useIdentity();
  await identity.session.whenSettled();
  if (!identity.viewer.isAuthorized.value) {
    return navigateTo("/login");
  }
});
```

### Permissions

Permission checks work through the `identity.permissions` adapter you configured;
without it, only explicit scope chains can grant access. Permissions are plain
strings at the layer boundary — wrap with your own literal-union type if you want
stricter checking.

```ts
const { hasPermission, useHasPermission } = identity.permissions;

hasPermission({ permission: "EVENT_OWNER" });
hasPermission({ permissions: ["EVENT_OWNER", "LEAGUE_OWNER"] }); // any-of
hasPermission({ permission: "EVENT_OWNER", collection: scopedCollection }); // walks inheritsFrom
const canEdit = useHasPermission({ permission: "EVENT_OWNER" }); // ComputedRef
```

For the coarser "may this reader be here at all?" question — a screen shell deciding
between rendering and a 403 — reach for the chain helper directly:

```ts
import { scopeChainHasAnyPermission } from "#layers/director-identity/app/core/permissions";

if (!scopeChainHasAnyPermission(event.permissions)) {
  throw createError({ statusCode: 403 });
}
```

Both chain helpers walk `inheritsFrom` to the end, which matters when a backend
answers a scoped query with a derived row: the row itself carries no permissions and
hangs the real grant off its parent, so reading `scope.permissions` alone reports "no
grant" for someone who in fact owns the parent scope.

### MFA / step-up challenges

With `identity.challengeApi` configured:

```ts
const { completeMfaChallenge, createStepUpChallenge, completeStepUpChallenge } = useIdentityChallenge();

// After login returned MFA_REQUIRED:
await completeMfaChallenge(challengeId, code); // validates + consumes, then loads the user

// Step-up for a sensitive action while already authenticated:
const challenge = await createStepUpChallenge("unlock");
await completeStepUpChallenge(challenge.value.challengeId, code);
```

### Keep-alive ("are you still there?")

The idle-countdown state machine is here and unit-tested; the dialog is yours. Call
`useIdentityKeepAlive()` once from an app-mounted component that has your dialog
context, and hand it the two paint callbacks:

```vue
<script setup lang="ts">
const keepAlive = useIdentityKeepAlive({
  openDialog: deadlineMs => openMyCountdownDialog(deadlineMs), // absolute epoch ms
  closeDialog: () => closeMyCountdownDialog(),
  // Optional: used by recoverAuth() when a refresh cannot rescue the session.
  promptRelogin: async () => await openMyReloginDialog(),
});

// Wire your dialog's "I'm still here" button to:
keepAlive.confirm();
</script>
```

From then on, a renewal that falls due while the user is idle
(`timing.idleAfterMs`) opens your dialog instead of renewing silently, counting down
to a deadline already clamped inside the real token expiry
(`timing.keepAliveCountdownMs`, `timing.keepAliveSafetyMarginMs`). Confirming renews;
letting it lapse **revokes the session server-side** and settles it as `expired`,
keeping the user for a re-login prefill. Show your re-login UI off
`session.status === SessionStatuses.Expired`, and `session.expiredReason` says which
of the five endings it was.

Until something registers, idle never blocks renewal and an expired session simply
logs out locally. (`useIdentityKeepAlive` is the supported wiring;
`identity.session._keepAlive` is the low-level seam underneath it, if you need to
compose the controller yourself.)

## Passkeys (optional)

Two `app.config` keys, and neither is set by default — an app that never enables passkeys
is unaffected by any of this.

```ts
// app/app.config.ts
import { makePasskeyApiClient } from "#layers/director-identity/app/utils/passkeyApi";
import { makePasskeyCeremony } from "#layers/director-identity/transports/passkey";

export default defineAppConfig({
  identity: {
    api: () => ({ /* … */ }),
    passkeyApi: () => makePasskeyApiClient(useRuntimeConfig().public.identityApi),
    passkeyCeremony: () => makePasskeyCeremony(),
  } satisfies IdentityAppConfig,
});
```

`makePasskeyCeremony` is imported by **your app**, not by the layer, and that is not a
style choice. Nuxt puts `<layer>/app/**` into the consuming app's TypeScript program, so a
file in there importing `@simplewebauthn/browser` would make every consumer of this layer
install it just to typecheck — including apps that will never register a passkey. It lives
in `transports/`, outside `app/`, for the same reason `@directorkit/gql` puts
`makeGraphqlWsForwarder` there. That is what makes the optional peer dependency honest.

```bash
pnpm add @simplewebauthn/browser
```

Then:

```ts
const { isAvailable, enrol, authenticate } = usePasskey();
```

- `isAvailable()` — configuration *and* browser capability. Safe to call before either
  exists, so a screen can ask without a try/catch.
- `enrol()` — the two round trips of registration, for a user who is already signed in.
- `authenticate(username?)` — the assertion half of a sign-in. Omit the username for a
  discoverable login: no username box, the authenticator picks, and the assertion says who
  signed.

**`authenticate` does not finish the login.** It returns the signed assertion and its
challenge id; turning those into a session is your app's own login flow — the same one the
password path goes through, including whatever it decides about MFA. The server package
leaves that route to the application for the same reason: a second endpoint issuing
sessions its own way is how two subtly different ways in appear.

Every failure is a `PasskeyErrorResults` value, and one of them is not a failure:
`Cancelled` means the person dismissed the browser's prompt. Reporting that as an error is
the first thing every WebAuthn front end gets wrong.

Three of the others are not about the credential either. Passkey sign-in usually shares
its backend's login rate-limit partition with the password endpoint, so `RateLimited`,
`GloballyRateLimited` (both carrying `retryAfterSeconds` when the server named one) and
`ServerUnavailable` are reported separately from `Rejected` — telling someone their
passkey was refused is how a working credential gets deleted over a limiter they tripped
by clicking twice. They are the same two limiters as `TooManyAttempts` and
`TooManyRequests` above, under names that also fit enrolment, which this enum covers and
`LoginErrorResults` does not.

The server half is `Director.Identity.WebAuthn`, whose three routes this client calls.

## Testing

`pnpm test` runs the layer's Vitest suite: the pure factories are tested with plain
fakes, and Nuxt-touching pieces run against the `#app` stub in `test/nuxtApp.ts`
(ADR-0008). The playground's `/identity` page plus `playground/e2e/identity.spec.ts`
drive the full consumer contract against an in-browser mock backend (`demo` / `demo`).
