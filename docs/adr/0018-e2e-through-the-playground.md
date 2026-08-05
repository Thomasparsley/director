# 0018 — E2E through the playground, with Playwright

Status: Accepted

## Context

ADR-0008 built the unit story: plain Vitest per package, with `#layers/*` aliases,
auto-imports, `#components`, NuxtLink, icons and `ResizeObserver` all hand-stubbed.
Its own words: *"We test the code, not the wiring."* ADR-0009 named the gap that
leaves — the playground is the only artifact where the wiring is real, and *"the
integration check is a human running `pnpm dev` and looking. The playground has no
tests of its own — only `typecheck` is automated."*

This ADR closes that loop: the human look is now automated.

## Decision

**End-to-end tests run Playwright against a production build of the playground,**
and live in `playground/e2e/`. `docs/e2e-test-plan.md` holds the full plan; this
records the load-bearing decisions.

- **Playwright, not `@nuxt/test-utils/e2e`.** The webServer block builds the
  playground and serves it (`nuxt build` → `node .output/server/index.mjs`); the
  suite gets the trace viewer, UI mode and retries for free. `reuseExistingServer`
  points the same suite at a running `pnpm dev` for local iteration.
- **A production build, not the dev server.** It is what ships, it exercises SSR
  the way a consumer sees it, and it drops HMR/warm-up flake. The build is the long
  pole; one build per run, amortized across every spec.
- **The unit/E2E boundary is a rule, not a vibe:** if a behaviour is provable in a
  package's Vitest suite, it does not get an E2E test. E2E asserts flows and wiring
  — real layer resolution, auto-imports, router, teleports/popovers, SSR+hydration,
  color mode — never exhaustive prop matrices. One happy path + one failure path per
  flow.
- **The console fixture is the highest-leverage line in the suite.** Every test runs
  through an extended `test` that fails at teardown on any `console.error`/`warning`
  or `pageerror`. Vue prints hydration mismatches as warnings, so *every* page any
  spec visits is implicitly asserted hydration-clean. The allowlist starts empty;
  entries require a justifying comment.
- **Selectors are role/label-based**, never Uno-generated classes and (almost) never
  testids. A control that can't be found by role+name is a finding, not a selector
  problem — the reka-ui components already carry the roles.
- **Determinism:** `reducedMotion: "reduce"` kills teleport/vaul transition flake,
  and `timezoneId`/`locale` are pinned so date controls don't float with the runner.
  No `waitForTimeout`; assertions auto-retry.

**Two layers were only demoed *because* E2E needed them to be** — closing debt
ADR-0009 flagged. `playground/app/pages/filters.vue` gives `@directorkit/filters` its
first demo (query-per-field + serialized-object storage over a filtered list).
`@directorkit/dialogs` was wired into the playground for the first time (extends + dep +
demo page + nav entry), and — because the layer holds *state, not paint* (ADR-0017) —
the demo had to supply `DialogHost`, the first real rehearsal of that consumer
contract. A `SunMoon` theme toggle was added to `app.vue` so color mode is drivable.

**CI is new too.** The repo had no GitHub Actions at all; `.github/workflows/ci.yml`
adds the whole ladder (lint → typecheck → unit → build+e2e), cheap gates first,
Playwright report uploaded on failure.

## Consequences

- The playground is no longer "a demo that only typechecks". A component that renders
  wrong, a layer that misresolves, or a page that hydrates dirty now fails a build.
- **The suite tests the assembled app, so it is only as honest as the demos.** A flow
  no playground page exercises is still uncovered; the `smoke.spec.ts` route list is
  literal so adding a page without a spec is a visible omission in review — the sixth
  part of ADR-0009's five-part ritual.
- **`DialogHost` is a playground artifact, not a shipped one.** It proves the state
  contract (open/close, the manager stack, value-to-opener, unregister-on-navigate);
  focus trapping/restoration is paint the real consumer (firesport) still owns, and
  is deliberately not asserted.
- Writing the suite surfaced real interaction facts worth recording: a text field
  that blurs on Submit-mousedown can validate itself into an error and disable Submit
  before the click lands (so the empty-form test dirties via the Newsletter switch);
  the date picker keeps its calendar open after a pick (Escape closes it); the number
  stepper renders disabled in SSR markup and only enables post-hydration (so keyboard
  stepping is the stable path). These are load-bearing for the tests and would
  otherwise be rediscovered painfully.
- **A malformed `queryObject` filter param throws** in `deserializeQueryData` (no
  guard) — a crash, not a graceful fallback. Left as a known gap rather than tested
  as if it degraded cleanly; worth closing in the filters layer.

## Alternatives considered

- **`@nuxt/test-utils/e2e`.** Manages the Nuxt server for you, but adds a second
  runner-integration layer for little gain over Playwright's webServer, and forfeits
  the trace viewer / UI mode / sharding. Rejected.
- **Dev server instead of a production build.** Faster to boot, but not what ships,
  weaker on SSR, and flakier (HMR). Kept as the *local* fast path via
  `reuseExistingServer`, not the CI target.
- **Visual regression / axe-core / multi-browser.** All deferred (plan §5.8): high
  flake or a separate initiative. The role-based selector policy already applies
  constant low-grade a11y pressure; the rest is a config line when wanted.
