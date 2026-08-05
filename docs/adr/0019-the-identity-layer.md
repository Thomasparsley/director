# 0019 — The identity layer: session state behind an app-supplied API interface

Status: Accepted

## Context

firesport carries a mature identity layer: one owner of session state (status, user,
token expiry) with pure, dependency-injected logic around it — a session state
machine, an expiry-scheduled token lifecycle with wake resync, an idle keep-alive
controller, and transport-level auth recovery. Years of subtle session bugs are fixed
in that core: independent `useCookie` refs that don't sync (so the store shares one
ref per cookie, memoised per Nuxt app), timers that sleep with the laptop (so renewal
is scheduled by absolute expiry and re-evaluated on visibility/focus/online), refresh
tokens that must never rotate during SSR (the rotated cookie would land in the wrong
jar), and a bootstrap that stays `unknown` — not `anonymous` — when SSR merely failed
to reach the backend, so the client retries instead of painting a logged-out shell.

That layer also carries everything firesport-specific: Vue components, route
middlewares, login/registration/password-reset forms, MFA/keep-alive dialogs, tester
tools, a GraphQL `me` query, an i18n error-message mapping, and a hardcoded
permission catalog. None of that generalises; all of it sits next to code that does.

The port had one structural question to answer: every consumer of a generic identity
layer has a **different backend**. The session flows are the same everywhere; the
transport is never the same twice.

## Decision

**`@directorkit/identity` is a logic-only layer extending `@directorkit/common`, and the
app supplies its backend as an object implementing the `IdentityApi` interface,
configured in `app.config`.**

- **The seam is an interface, not a base URL.** `identity.api` in `app.config` is a
  factory returning `{ sendLoginRequest, sendRefreshAccessTokenRequest,
  sendLogoutRequest, fetchUser }`. The session state machine only ever calls those
  four operations; REST, GraphQL or an in-browser mock all plug in the same way. The
  factory is invoked lazily, once per app, inside Nuxt context — so it may read
  `useRuntimeConfig()`. For backends that follow the default REST contract
  (`/login`, `/token-refresh`, `/logout`, httpOnly tokens + JS-readable
  `has_acc_tkn`/`has_rfrsh_tkn` marker cookies), the layer ships
  `makeIdentityApiClient` — spread it and write only `fetchUser`. An optional
  `identity.challengeApi` (same pattern) unlocks the MFA / step-up challenge flows.
- **The rest of `app.config.identity` covers what upstream hardcoded:** timing
  overrides merged over `defaultIdentityTiming`, marker-cookie names, a logger
  factory (silent by default), and a permissions adapter (`hasFullAccess` /
  `permissionsOf`) that teaches the layer where permissions live on the app's user
  shape. `useIdentityRuntime()` resolves and memoises all of this per Nuxt app.
- **The user is an augmentable interface.** The layer stores and hands back
  `IdentityUser` without looking inside it; the app declares the real shape by
  augmenting `#layers/director-identity/app/types/user`. Upstream's GraphQL-derived
  user type is exactly what could not be ported.
- **The pure core ports unchanged.** `sessionService`, `tokenLifecycle`,
  `keepAliveController`, `authRecovery`, and the `core/` helpers keep their
  dependency-injected shape and their specs. The single Nuxt-ism that had leaked into
  the service (`import.meta.client` as the bootstrap `canRecover` default) became an
  injected `canRecoverByDefault`, supplied by the Nuxt wiring.
- **The plugin refuses to boot unconfigured.** Without `identity.api` it provides
  `undefined` (and warns in dev); `useIdentity()` throws a descriptive error. A layer
  in `extends` must never crash an app that hasn't configured it yet.
- **Like dialogs (ADR-0017), the layer holds state and ships no paint.** The
  keep-alive/re-login dialogs, login forms and route middlewares stay in the app;
  the `_keepAlive` seam on the identity instance is where an app-mounted component
  takes over idle-gating and expiry prompts. Left behind on purpose: components,
  middlewares, forms, dialogs, validators, tester tools, the GraphQL `me` wiring,
  i18n error mapping, the permission catalog, and (for now) the passkey/WebAuthn
  clients — the latter can port later as an optional module with its own
  `@simplewebauthn` dependency.

The playground demonstrates the consumer contract end-to-end with an in-browser mock
backend (`demo` / `demo`): `IdentityApi` in `app.config`, an augmented
`IdentityUser`, marker cookies carrying the session across a reload, and the E2E
specs driving login/reload/logout through it.

## Consequences

- Consumers get the whole hardened session core — sliding renewal, wake resync,
  browser-restart recovery, single-flight bootstrap — by extending the layer and
  writing one object. Nothing about their API shape is assumed.
- `identity.api` is mandatory configuration. The plugin no-ops without it, so adding
  the layer is safe but inert until the app commits to a backend.
- Permission checks are stringly-typed at the layer boundary (`IdentityPermission =
  string`); an app that wants literal-union safety wraps `hasUserPermission` with its
  own narrower type. The old GraphQL-derived union could not survive the port.
- The keep-alive and re-login UX is consumer work by design: the controller is here
  and unit-tested, and `useIdentityKeepAlive()` wires it to the `_keepAlive` seam from
  an app-mounted component that supplies the dialog paint. Until an app calls it, idle
  never blocks renewal and an expired session simply logs out.
- An idle keep-alive lapse revokes the session server-side before dropping the local
  tokens. It is the one expiry reason whose session is still alive at the backend, so
  without the revoke the timeout would be cosmetic (the httpOnly tokens stay valid in
  the jar) while the discarded refresh marker would still cost the user a full
  credential re-entry. Every other expiry reason is already dead server-side.
- `app.config` holds functions here. That is legal (app config is bundled, not
  serialized), but it means identity config cannot come from `nuxt.config`'s
  `runtimeConfig` — environment-dependent values (the API base URL) belong to the
  app's `identity.api` factory, which may read runtime config itself.
