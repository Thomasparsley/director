# E2E test plan — Playwright against the playground

Status: Proposed

## 1. Why, and why now

The testing story has a deliberate, documented hole:

- **ADR-0008** — unit tests are plain Vitest per package. The `#layers/*` aliases,
  auto-imports, `#components`, NuxtLink, icons, `ResizeObserver` are all
  hand-stubbed. Quote: *"We test the code, not the wiring."*
- **ADR-0009** — the playground is the only artifact where the wiring is real,
  and *"the integration check is a human running `pnpm dev` and looking. The
  playground has no tests of its own — only `typecheck` is automated."*

E2E tests are the automation of exactly that human look. Their charter is the
complement of the unit suites:

| Covered by unit tests (ADR-0008) | Covered by E2E (this plan) |
| --- | --- |
| Form model semantics (status, patch, transformers, validators) | The same semantics *through the DOM*, wired via auto-imports and real layer resolution |
| cva class strings, component DOM contracts in happy-dom | Real rendering in Chromium: Uno discovery, teleports, popovers, focus, keyboard |
| Composables with router mocked | Real vue-router: navigation active state, query-param persistence, back/forward |
| Nothing | SSR + hydration (no mismatch warnings), dark mode, the assembled layer chain |

Rule of thumb for scope discipline: **if a behaviour is provable in a package's
Vitest suite, it does not get an E2E test.** E2E asserts flows and wiring, not
exhaustive prop matrices. One happy path + one failure path per flow; variants
stay in unit tests.

## 2. Tooling decision

**Playwright (`@playwright/test`) running against a production build of the
playground (`nuxt build` → `node .output/server/index.mjs`).**

Rationale:

- ADR-0008 rejected Nuxt-in-tests for *unit* speed. E2E is the opposite trade:
  we want the real Nuxt build, once, amortized across every spec.
- Production build (not `nuxt dev`) because: it's what ships; it exercises SSR
  the way a consumer would see it; and it removes dev-server HMR/warm-up flake.
  Locally, Playwright's `webServer.reuseExistingServer` lets you point the same
  suite at a running `pnpm dev` for fast iteration.
- `@nuxt/test-utils/e2e` was considered — it manages the Nuxt server for you —
  but it brings a second runner-integration layer for little gain, and Playwright's
  `webServer` block does the same job with better tooling (trace viewer, UI mode,
  codegen, retries, sharding). Rejected.
- Chromium-only to start. WebKit/Firefox are a config line later; they are not
  where the risk is (the risk is wiring, not browser divergence).

## 3. Where it lives

E2E is a property of the *assembled app*, not of any package, so it lives in the
playground:

```
playground/
  e2e/
    fixtures.ts            # extended `test` with console/pageerror capture
    helpers/
      forms.ts             # shared form interaction helpers
    smoke.spec.ts
    navigation.spec.ts
    forms.spec.ts
    form-ui.spec.ts
    filters.spec.ts        # after prerequisite P1
    dialogs.spec.ts        # after prerequisite P2
    theming.spec.ts
    identity.spec.ts       # added with the identity layer (ADR-0019)
    gql.spec.ts            # added with the gql layer (ADR-0021)
  playwright.config.ts
```

`playground/package.json` gains:

```jsonc
"scripts": {
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
},
"devDependencies": {
  "@playwright/test": "^1.x"
}
```

Root `package.json` gains `"test:e2e": "pnpm --filter @directorkit/playground test:e2e"`.
Nothing changes in any published package — E2E adds zero weight to the layers.

### playwright.config.ts (shape)

```ts
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html"]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    timezoneId: "Europe/Prague",   // pin: date controls must not float with the runner
    locale: "en-US",               // pin: month/day names in calendar assertions
  },
  webServer: {
    command: "pnpm build && node .output/server/index.mjs",
    port: 3000,
    reuseExistingServer: !process.env.CI,   // local: run against `pnpm dev` if it's up
    timeout: 180_000,                       // nuxt build is the long pole
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

### Conventions

- **Selectors: role- and label-based** (`getByRole`, `getByLabel`, `getByText`),
  never CSS classes (they're Uno-generated) and no `data-testid` unless a thing
  is genuinely unaddressable. This doubles as a cheap accessibility contract —
  if a control can't be found by role+name, that's a finding, not a selector
  problem. The components are built on reka-ui, so roles/aria are already there.
- **Test names read as statements of intent**, matching the house style from
  ADR-0008: *"trims the name on blur, not on every keystroke"*, not
  *"test stringTrimTransformer"*.
- **Animations off**: inject `page.emulateMedia({ reducedMotion: "reduce" })` in
  the shared fixture; popover/vaul transitions are the classic flake source.
- **No test may depend on another**; every spec starts from `page.goto(...)`.

### The console fixture (cross-cutting, load-bearing)

Every test runs through an extended `test` from `e2e/fixtures.ts` that:

1. collects `console.error`/`console.warning` and `pageerror` events,
2. **fails the test** at teardown if any were emitted, with an allowlist
   (empty to start; entries require a comment justifying them).

This is what turns *every* E2E test into a hydration test for free: Vue prints
hydration mismatches as console warnings, so any page visited by any spec is
implicitly asserted hydration-clean. This single fixture is the highest
value-per-line item in the whole plan.

## 4. Prerequisite playground work

Two layers aren't demoed, and you can't E2E-test what the app doesn't render.
Per ADR-0009, adding a layer to the playground is a five-part ritual (extends
entry + workspace dep + demo page + nav entry + README diagram). Each
prerequisite is its own commit, authored with its spec, before its suite lands.

**P1 — Filters demo page** (`playground/app/pages/filters.vue`).
Already extended and in deps since `ceb16f3`; only the page + nav entry are
missing (ADR-0009 flags this explicitly). The page should exercise both storage
modes since URL behaviour is the whole point of the layer:

- a filter form (e.g. `search: string`, `role: string | null`, `active: boolean`)
  with `storage: "query"` (per-field params),
- a second form with `storage: "queryObject"` (one serialized param),
- a visible result area (e.g. a filtered static list) so assertions have a
  behavioural anchor, not just URL inspection.

**P2 — Dialogs wiring + demo page.** `@directorkit/dialogs` is not in
`playground/nuxt.config.ts` `extends` nor in its deps at all — the full
five-part ritual applies. The demo page needs: a button opening a dialog, a
nested (stacked) dialog, a dialog whose result resolves back to the opener, and
a route-change scenario. Note the layer holds *state, not paint* (ADR-0017), so
the demo page also has to supply the rendering shell the way a consumer would —
which makes it the first real rehearsal of that consumer contract.

**P3 (small) — stable landmarks.** Verify `app.vue`'s shell exposes what the
specs need: the nav has `aria-label="Main"` (it does), the toggle button has
`aria-label="Toggle sidebar"` (it does), page `<h2>` headings are real headings.
Fix any gaps found while writing the first suite; prefer fixing the component
over adding a testid.

## 5. Test suites, spec by spec

### 5.1 `smoke.spec.ts` — every page renders clean

For each route in a literal route list (`/`, `/forms`, `/form-ui`, `/filters`,
`/dialogs`, plus one catch-all like `/leagues/mine`):

- loads with HTTP 200, `h2`/main content visible,
- zero console errors/warnings (the fixture does the assert),
- **SSR check**: fetch the route with `page.request.get()` and assert the payload
  contains a known server-rendered string (e.g. "Buttons" for `/`) — proves SSR
  produced real markup, not an empty shell later filled by the client.

Keep the route list literal and colocated so adding a page without a smoke entry
is a visible omission in review (mirror of the five-part ritual).

### 5.2 `navigation.spec.ts` — core layer wiring

The unit tests mock NuxtLink and the router (ADR-0008); this is where the real
ones get exercised. Against the sections defined in `playground/app/app.vue`:

- *clicking "Forms" navigates to /forms and marks the item active* — assert
  `aria-current` (or the component's active contract) moves, old item deactivates.
- *deep-linking to /leagues/mine on first load auto-expands "Leagues" and marks
  the child active* — this is ADR-0016's "resolves its active item once"
  behaviour under a real router, and the reason `[...slug].vue` exists.
- *back/forward moves the active state without a reload*.
- *the disabled "Tools" item does not navigate* — URL unchanged after click.
- *collapsing the sidebar via the toggle keeps navigation usable* — collapse,
  navigate somewhere, assert route changed; expand, assert active state correct.
- *badges and chips render with real auto-imported icons* — assert the "12"
  badge and success chip are visible on their items (this is the auto-import +
  icon wiring the unit tests stub via `test/icons.ts`).
- *keyboard: Tab reaches nav items, Enter activates* — one scenario, not a full
  keyboard matrix.

### 5.3 `forms.spec.ts` — the forms model through a real DOM

Against `/forms` (raw `useFormGroup` + native inputs). Unit specs already prove
the model exhaustively; here each scenario exists to prove a *wired flow*:

- *submit is disabled until the form is valid, and enabled once it is* — drive
  `name`/`email` through invalid → valid, watch the Submit button's disabled
  state (covers `useFormSubmit.isDisabled` → DOM).
- *blurring the name field trims it* — type `"  Jane  "`, blur, assert the input
  and the "Live form data" `<pre>` both show `"Jane"` (lazy transformer timing).
- *an invalid email shows its message on blur and clears when fixed*.
- *nested group participates in parent status* — make `address.city` invalid,
  assert the status badge flips to Error even though the failing control is in
  the child group.
- *"Patch example data" fills every field including the nested group, and the
  form reads dirty* — then *submit trims the patched name* (patch + transformer
  interplay, ADR-0011).
- *submit shows the pending state, then the payload* — click Submit, assert the
  button reads "Submitting…" and is disabled during the 800 ms wait, then "Last
  submitted payload" appears with the expected JSON (covers ADR-0014's
  submit-returns-a-callback timing: the payload must not appear before the wait
  resolves).
- *Reset returns fields, status badge, and live data to pristine*.

Helper: a `readLiveData(page)` that parses the "Live form data" `<pre>` into an
object, so assertions compare structured data, not substring soup.

### 5.4 `form-ui.spec.ts` — every DForm* control, once, for real

Against `/form-ui`. This is the suite happy-dom fundamentally can't host
(popovers, teleports, pointer capture — the whole stub list in
`packages/ui/test/setup.ts`). One focused scenario per control:

- **DFormInput** — *label is wired: clicking the "Name" label focuses the input*;
  required marker and description render.
- **DFormSelect** — *opens on click, arrow keys move, Enter selects "Editor",
  live data shows `role: "editor"`*; *the disabled "Owner (taken)" item cannot be
  selected*. (Real teleport + pointer capture — exactly what unit tests stub.)
- **DFormInputNumber** — *increments within 1–50 and clamps at the max*;
  *typing 0 then blurring yields a range validation error*.
- **DFormDateField** — *typing segments produces a value in live data*;
  *leaving it empty and submitting shows the required error* (null-is-empty,
  ADR-0012).
- **DFormDatePicker** — *opening the calendar popover and clicking a day fills
  the field and closes the popover*. Pin the assertion to a fixed date via the
  segments or a known month navigation, never "today" (timezone/locale pinned in
  config, but "today"-relative assertions still rot).
- **DFormTimeField** — *setting 10:15 stores the `"10:15"` string in live data*
  (the HH:mm contract stated in the page's help text).
- **DFormPinInput** — *typing 5 digits fills the OTP and live data*;
  *4 digits + submit shows the min-length error*; *paste of "12345" distributes
  across cells*.
- **DFormSwitch** — *toggles by click and by Space; live data flips*.
- **Cross-control**: *submitting the empty form marks name, email, role, and
  birthday invalid simultaneously* (error rendering at scale); *Reset clears
  values and errors across all nine controls*.
- *full happy path*: fill everything validly, submit, assert the complete
  submitted JSON payload (types intact: number seats, boolean newsletter, date
  string, `"09:30"`).

### 5.5 `filters.spec.ts` — URL is the storage (after P1)

The layer's contract is form ⇄ URL, which only a real router + real browser
history can prove (the unit suite needed an app-unmount workaround just to run
at all — noted in `filters-package-origin` memory):

- *typing a search value updates the query param (debounced if applicable) and
  the filtered list*.
- *reloading the page with `?search=abc&role=editor` hydrates the form from the
  URL* — fields pre-filled, list pre-filtered, no hydration warnings (fixture).
- *back/forward walks filter history* — change filter twice, go back, assert
  form and list revert; forward, they return.
- *clearing a filter removes its param* (null-is-empty, ADR-0012 — the param
  should disappear, not persist as `?role=`).
- *queryObject mode: round-trips non-ASCII values* — set search to `"Příliš
  žluťoučký"`, reload from the resulting URL, assert it survives. This is a
  regression test for the btoa/UTF-8 fix made during the firesport port; it
  belongs in E2E because the encode/decode meets the real URL bar here.
- *deep link with a malformed queryObject param falls back gracefully* (no crash,
  no console error — define "gracefully" while building P1).

### 5.6 `dialogs.spec.ts` — state, not paint, wired to paint (after P2)

- *open → dialog visible, focus moves in; close → focus returns to the trigger*.
- *Escape and overlay-click close (or don't, per the demo's config) — assert the
  chosen contract explicitly*.
- *stacked dialogs: opening a second dialog over the first, closing the top one,
  returns to the first* (the manager's stack semantics through real DOM).
- *a dialog resolving a value delivers it to the opener* — assert the page shows
  the result after confirm.
- *navigating routes while a dialog is open* — assert the defined behaviour
  (likely: dialog closes; decide in P2 and pin it here).
- *SSR isolation is not E2E-testable directly* (one browser = one app instance);
  the plugin's per-app scoping stays a unit concern. Noted so nobody tries.

### 5.7 `theming.spec.ts` — dark mode and responsive shell

- *color-mode toggle flips the root class and persists across reload* (real
  `@nuxtjs/color-mode` wiring; unit tests never see it).
- *`prefers-color-scheme: dark` is respected on first visit* via
  `emulateMedia({ colorScheme: "dark" })` — assert a token-driven background
  actually changed (one computed-style assertion, not a visual diff).
- *at mobile width the app shell remains usable* — `setViewportSize` small,
  navigate somewhere. Only if the shell claims responsive behaviour; check
  `appShell.vue` first and skip if it doesn't.

### 5.8 `identity.spec.ts` — the session contract end to end

Against `/identity`, where the playground plays the consumer: `@directorkit/identity`
holds the session state and the app supplies the backend as an in-browser mock
through the `IdentityApi` interface in `app.config` (`demo` / `demo`). Unit specs
already cover the state machine with fakes; what only a browser proves is that the
plugin, the marker cookies and hydration agree.

- *bootstrap settles an unauthenticated visit to `anonymous`* — the plugin actually
  runs and resolves, rather than leaving the page stuck at `unknown`.
- *login loads the user, survives a reload, and logs out again* — the reload leg is
  the real prize: it exercises SSR leaving the session `unknown`, the client
  bootstrap recovering from the marker cookie, and no hydration mismatch on the way
  (the console fixture fails the test if one appears).
- *wrong credentials surface an error and stay anonymous*.

Known-uncovered here, deliberately: the MFA / step-up flows (the playground
configures no `challengeApi`) and the `expired` state with its keep-alive and
re-login dialogs (the playground mounts no keep-alive component). Both are unit-
tested; both need playground prerequisites before they can gain a spec.

### 5.9 `gql.spec.ts` — the GraphQL layer against a real server

Against `/gql`, where the playground plays the consumer twice over: it configures
`@directorkit/gql` through `app.config` **and** serves the schema itself, from a toy
in-memory GraphQL route (`server/api/graphql.post.ts`). Unit specs cover the executors
against a fake urql client; what only a browser proves is that a query really crosses
the network during SSR and does not cross it again on hydration.

- *the list is server-rendered and hydrates without refetching* — the load-bearing one.
  The books are in the SSR markup, and the spec asserts **zero** `/api/graphql` requests
  after hydration, which is the SSR payload cache doing its job.
- *typing in the search box refetches with the new variables* — a `Ref` in `variables`,
  watched and debounced.
- *adding a book round-trips the mutation and shows up in the list*.
- *a payload-level error reaches its typed handler, not the notice list* — the two
  failure channels are distinct: `handleMutationResult` dispatches a payload's own
  `errors` entry to its `on<Code>` handler and does **not** also announce it, so a
  handled failure is reported once.
- *a GraphQL execution error is routed to `gql.notify`* — the other channel.

Two notes on determinism. The toy server's book list is process-wide state and specs run
in parallel, so assertions use containment rather than absolute counts, and anything a
spec adds carries a title unique to that run. And the demo page keeps its controls
disabled until it mounts — a server-rendered control is clickable before its handler
exists, so this is both the honest UX and the thing the specs wait on.

Known-uncovered here, deliberately: **subscriptions**. A `graphql-ws` server in Nitro is
disproportionate for the playground, so `useSubscriptionAsync` is unit-tested against a
fake transport instead.

### 5.10 Explicitly out of scope (for now)

- **Visual regression screenshots** — high flake cost, and the component-level
  DOM contracts already live in unit tests. Revisit once the suite is stable, as
  an opt-in `--grep @visual` project.
- **axe-core accessibility audits** — worthwhile, but a separate initiative;
  the role-based selector policy already applies constant low-grade a11y
  pressure. When added: `@axe-core/playwright` per page in `smoke.spec.ts`.
- **Multi-browser matrix** — config-only change when wanted.
- **Testing firesport against these layers** — that's firesport's suite; the
  playground rehearses the consumer contract (ADR-0007/0009) and that's the
  boundary.

## 6. CI

There are **no GitHub Actions workflows in the repo at all today** — lint,
typecheck, and unit tests are also unenforced. Rather than bolt E2E onto
nothing, add one workflow with the full ladder (cheap → expensive):

`.github/workflows/ci.yml`, on PR + push to main:

1. `pnpm install` (with pnpm + node 20 setup, store cached)
2. `pnpm lint` / `pnpm typecheck` / `pnpm -r --if-present test` — parallel jobs
3. `e2e` job: `pnpm exec playwright install --with-deps chromium`, then
   `pnpm test:e2e` (the webServer block builds the playground itself)
4. on failure: upload `playwright-report/` + traces as artifacts

Budget expectation: install + build ≈ 3–5 min, suite < 2 min at this size.
Retries = 2 on CI only; a test that needs its retry gets a flake issue, not a
shrug — the console-error fixture makes most flakes loud early.

## 7. Rollout order

Each step lands green before the next starts; prerequisites are authored with
the spec that needs them (the ADR-0009 pattern: change + proof in one commit).

1. **Scaffold** — Playwright config, fixtures, `smoke.spec.ts` for the 3 existing
   pages, CI workflow. *This alone closes the "nothing fails a build if a
   component renders wrong" hole.*
2. **`navigation.spec.ts`** — highest wiring density (router, NuxtLink, icons,
   auto-imports), zero prerequisites.
3. **`forms.spec.ts` + `form-ui.spec.ts`** — the bulk of the value; forms first
   (simpler DOM), then form-ui control by control.
4. **P1 + `filters.spec.ts`** — clears the ADR-0009 "only layer without a demo"
   debt and covers the URL contract incl. the UTF-8 regression.
5. **P2 + `dialogs.spec.ts`** — full five-part ritual for dialogs.
6. **`theming.spec.ts`**, then reassess the out-of-scope list.
7. **ADR-0018 — "E2E through the playground"** — record the decision (Playwright,
   production build, console-fixture-as-hydration-test, the unit/E2E boundary
   rule), amending ADR-0009's "no tests of its own" consequence.

## 8. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Nuxt build makes the suite slow to start | One build per run, amortized; `reuseExistingServer` locally; keep the suite one `webServer` |
| Popover/teleport animation flake | `reducedMotion: "reduce"` fixture + Playwright auto-wait on role queries; never `waitForTimeout` |
| Date/time assertions drift with runner TZ/locale | Pinned `timezoneId`/`locale` in config; no "today"-relative assertions |
| Console fixture too strict (3rd-party noise) | Allowlist with mandatory justification comments; start empty and see |
| Suites drift from playground pages as demos evolve | Route list is literal in `smoke.spec.ts`; the five-part ritual grows a sixth part: "+ e2e spec" |
| E2E scope creep into prop-matrix testing | The boundary rule in §1: provable in Vitest ⇒ not an E2E test; enforce in review |
