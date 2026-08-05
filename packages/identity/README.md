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

```vue
<script setup lang="ts">
const identity = useIdentity();

// Reactive session state
identity.sessionStatus; // "unknown" | "anonymous" | "authenticating" | "authenticated" | "expired"
identity.isAuthorized;  // ComputedRef<boolean>
identity.user;          // ComputedRef<IdentityUser | undefined>

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
| `sessionStatus`, `isAuthorized`, `user` | Reactive views over the session store |
| `login(credentials)` | Login flow; resolves `OK`, `ALREADY_AUTHORIZED` or `MFA_REQUIRED` |
| `logout()` | Logs out server-side and clears local state unconditionally |
| `whenSettled()` | Resolves once the session is no longer `unknown` — await this in route guards |
| `bootstrap()` | Resolves the initial session (single-flight; the plugin already calls it) |
| `fetchMe()` / `refetchMe()` | (Re)load the current user into the store |
| `hasUserPermission(arg)`, `useHasUserPermission(arg)`, `hasUserFullAccess` | Permission checks (see below) |
| `recoverAuth()` | Wire into your data layer's auth-error hook (401 interceptor, GraphQL auth exchange) |
| `_keepAlive` | Low-level seam behind `useIdentityKeepAlive()` (see below); not part of the public API |

Session bootstrap is automatic: on the server the plugin settles the session from the
incoming marker cookies before rendering; on the client it recovers "browser
restarted, refresh cookie still present" sessions and retries fetches that failed
during SSR. Silent token renewal runs while the session is authorized — scheduled by
absolute expiry, resynced on tab wake — and pauses when it is not.

### Route guards

The layer ships no middleware (redirect targets are app policy). Write yours against
`whenSettled()`:

```ts
// app/middleware/authenticated.ts
export default defineNuxtRouteMiddleware(async () => {
  const identity = useIdentity();
  await identity.whenSettled();
  if (!identity.isAuthorized.value) {
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
identity.hasUserPermission({ permission: "EVENT_OWNER" });
identity.hasUserPermission({ permissions: ["EVENT_OWNER", "LEAGUE_OWNER"] }); // any-of
identity.hasUserPermission({ permission: "EVENT_OWNER", collection: scopedCollection }); // walks inheritsFrom
const canEdit = identity.useHasUserPermission({ permission: "EVENT_OWNER" }); // ComputedRef
```

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
`sessionStatus === "expired"`.

Until something registers, idle never blocks renewal and an expired session simply
logs out locally. (`useIdentityKeepAlive` is the supported wiring; `identity._keepAlive`
is the low-level seam underneath it, if you need to compose the controller yourself.)

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

The server half is `Director.Identity.WebAuthn`, whose three routes this client calls.

## Testing

`pnpm test` runs the layer's Vitest suite: the pure factories are tested with plain
fakes, and Nuxt-touching pieces run against the `#app` stub in `test/nuxtApp.ts`
(ADR-0008). The playground's `/identity` page plus `playground/e2e/identity.spec.ts`
drive the full consumer contract against an in-browser mock backend (`demo` / `demo`).
