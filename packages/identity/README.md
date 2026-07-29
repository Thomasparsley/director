# @director/identity

Session/auth state for Nuxt apps, as a logic-only Nuxt layer: one owner of session
state (status, user, token expiry) with pure, dependency-injected logic around it —
a session state machine, an expiry-scheduled token lifecycle with wake resync, an
idle keep-alive controller, and transport-level auth recovery.

The layer never assumes a backend. Every app supplies its own transport through the
**`IdentityApi` interface** in `app.config` — REST, GraphQL or an in-browser mock all
plug in the same way. It ships **no components, middlewares or forms**: it holds
state; painting login forms and dialogs is the consuming app's job (the same trade as
`@director/dialogs`, see ADR-0017/ADR-0019).

## Install

Add the layer to the app's `extends` (and its package to the dependencies):

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ["@director/identity"],
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

## Testing

`pnpm test` runs the layer's Vitest suite: the pure factories are tested with plain
fakes, and Nuxt-touching pieces run against the `#app` stub in `test/nuxtApp.ts`
(ADR-0008). The playground's `/identity` page plus `playground/e2e/identity.spec.ts`
drive the full consumer contract against an in-browser mock backend (`demo` / `demo`).
