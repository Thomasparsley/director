# 0022 — Integration tests against a real Nuxt server

Status: Accepted

## Context

The repo had two test tiers and a gap between them.

ADR-0008 built the unit tier: plain Vitest per package, with `#layers/*` aliases, `#app`
and auto-imports hand-stubbed. Its words: *"We test the code, not the wiring."* ADR-0018
built the E2E tier: Playwright against a production build of the playground, asserting
flows through a browser.

`@director/gql` is the first layer where that leaves a real hole. Almost everything it
does is **transport**: serializing an operation, choosing POST or GET, forwarding cookies
during SSR, resolving a persisted document id, holding a subscription open on a socket.
A fake urql client proves none of it — it proves the code around the transport. And a
browser proves it only for whatever the demo page happens to do, at browser cost, with no
way to assert what the *server* received.

The port itself made the point. Three of its worst defects (see ADR-0021) were invisible
to both tiers: the hardcoded operation kind only worked for persisted documents, the base
fetch options went where urql expected an operation context — silently dropping SSR
cookies — and urql v6's `preferGetMethod` default was quietly turning queries into GETs.
Each is a statement about bytes on a wire, and each needs a wire to be observable.

## Decision

**A third tier: integration tests that run the layer against a real Nuxt server, over real
HTTP and a real WebSocket, with no browser.**

- **The fixture is a Nuxt app, in the package.** `packages/gql/test/fixture` is the
  smallest app that extends the layer under test: no UI layer, no UnoCSS, one page. It
  serves a toy GraphQL schema over a Nitro route and — with
  `nitro.experimental.websocket` — a `graphql-ws` server on a socket. Both transports
  share one schema module, so a mutation sent over HTTP is what a socket subscriber hears.
  The playground stays what ADR-0009 made it: where the layers are seen working
  *together*. This is where one layer is exercised *alone*.
- **`@nuxt/test-utils/e2e` boots it; the client under test runs in Node.** `setup()`
  builds and starts the fixture, and the specs drive the layer's own plugin — which builds
  a real urql client — against `url()`. Nothing is faked between the composables and the
  socket except the Nuxt app object holding the plugin's provides. Two shapes of assertion
  follow: the layer driven *from* Node, and the layer running *inside* the rendering app
  (`$fetch("/books")` returns SSR HTML, and the spec reads the payload back out of it).
- **The specs drive the public composables**, not the executors beneath them. That is the
  surface a consumer has, and it keeps the tier honest about what it is proving.
- **The server is instrumented so the client's behaviour is observable from the outside.**
  The fixture echoes back the request method and the session cookie, and exposes a live
  subscriber count. That last one is the only way to prove teardown: a client that stops
  listening but leaves the server's generator open leaks one per disconnect, and no
  client-side assertion can see it.
- **It is a separate Vitest project** (`vitest.integration.config.ts`,
  `pnpm test:integration`), so `pnpm test` stays a sub-second unit run. `fileParallelism`
  is off — one server, one in-memory shelf — and CI runs it as its own step after the unit
  suite and before the browser suite.
- **Test code is typechecked too.** Nuxt's generated tsconfigs cover `app/` only, and
  esbuild strips types at run time, so a spec's type error is invisible until it rots into
  a real one. `tsconfig.test.json` covers the specs and their helpers. The fixture *app*
  is deliberately out of scope — typechecking it properly means preparing it first, and it
  is already covered by being built and run for real, where a compile error fails loudly.

### What the tier is for, and what it is not

Use it for anything whose truth lives on the wire: wire formats, headers, methods,
SSR-versus-client differences, socket lifecycle, and how the layer reacts to what a real
server actually returns. Do not use it for logic a fake can prove — that belongs in the
unit tier — or for anything about rendering, hydration or user interaction, which belongs
in the browser tier.

## Consequences

- Subscriptions are covered. ADR-0021 recorded them as untested beyond a fake transport,
  on the grounds that a `graphql-ws` server in Nitro was disproportionate for the
  playground. In a purpose-built fixture it is a dozen lines, because graphql-ws ships a
  crossws adapter and Nitro's WebSocket support *is* crossws. That gap is closed.
- Three tiers means three places a behaviour could be tested, so the boundary above is a
  rule, not a preference — the same discipline ADR-0018 applies to its own boundary.
- The fixture is a second Nuxt app to keep working. It is deliberately tiny, and it earns
  its keep: writing it immediately surfaced a bug in its own subscription iterator (an
  `async function*` parked on an `await` never runs its `finally` when graphql-js calls
  `.return()`, so every disconnect leaked a listener) — the kind of thing that would
  otherwise have been mistaken for a layer bug.
- CI grows one step of roughly twenty seconds. The fixture build dominates it; the
  requests themselves are local and quick.
- Node 20 is still the supported floor, so the specs pass an explicit `ws` implementation
  to the graphql-ws client rather than relying on the global `WebSocket` that only landed
  in Node 22.
