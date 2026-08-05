# 0017 — The dialogs layer holds dialog state, and does not paint it

Status: Accepted

## Context

`@directorkit/dialogs` is the port of firesport's `client/layers/dialogs`. It exists so a
caller can hand a component to `useModalDialog` / `useSheetDialog` and get back
`{ isOpen, openDialog, closeDialog, onCloseEvent }` — no `v-if`, no wrapper element,
no dialog markup anywhere near the page that opens it:

```ts
const { openDialog, closeDialog } = useModalDialog<Props, Emits>(EditTeamDialog, {
  props: computed(() => ({ teamId: teamId.value })),
  emits: { saved: () => closeDialog(), close: () => closeDialog() },
});
```

The layer had to be placed on the graph of ADR-0002, and firesport's split had to be
re-examined rather than copied: over there the state lives in `layers/dialogs` but the
component that paints it (`u/dialogManager.vue`) lives in `layers/ui`.

## Decision

**`@directorkit/dialogs` extends `@directorkit/common` and nothing else** — a sibling of `ui`
and `forms`, *"pure logic, no components"*. firesport's split was right and we keep it:
the state half needs nothing but Vue, so nothing but Vue is what it depends on.

**The manager is provided by a Nuxt plugin, one per app instance.** A module-level
singleton would be shorter, but on the server it would share one registry across every
request — dialog state leaking between users. The plugin scopes it to the app.

**The manager owns its keys.** firesport minted a `ulid()` per dialog at the call site;
the key never leaves the manager and is only ever a `v-for` key, so it is now a counter
inside the manager and `ulid` is not a dependency of this repo.

**Rendering is out of scope, and this layer ships no renderer.** `manager.instances` is
the contract: the dialogs to paint, in the order they were opened, each with the
component, props and emits to paint it with. See the open question below.

### Bugs fixed in the port, not carried over

- **`config.onClose` was never called.** It was declared on the config and passed by
  several call sites in firesport (dialogs for picking a preselection position and a
  starting position both relied on it) and nothing ever invoked it — so a dialog meant
  to reset its state on close silently never did, and one exported `onClose` hook that
  no consumer could have known was dead. It is now wired to `onCloseEvent`, and runs
  before any other listener. **This covers programmatic closes only** — see the
  constraint on the renderer below.
- **Reopening inside the close transition unmounted the dialog.** A close queues the
  unmount 333 ms out so the transition can play. Reopen before it fires and the timer
  still ran, filtering the freshly reopened dialog straight back out. The deferred
  unmount is now cancellable, and reopening cancels it.
- **The same dialog could be queued to paint twice**, handing the renderer a duplicate
  `v-for` key. `addToRender` is now idempotent.
- **`unregisterDialog` left the dialog painted for 333 ms** after its owner unmounted.
  Unregistering is now immediate: the owner is gone, there is no transition left to
  play. The delay belongs to closing, not to unregistering.

## Consequences

- The layer is reachable from no other layer — an app must list `@directorkit/dialogs` in
  its `extends` explicitly, exactly as it must for `@directorkit/forms` (ADR-0002).
- **Nothing paints dialogs yet, so the layer is not usable end-to-end.** It is complete
  and tested as a state machine, and inert until a renderer exists.
- `useDialogManager` reaches through `#app`, which does not exist under bare Vitest.
  `packages/dialogs/test/nuxtApp.ts` stubs it — the same trade as core's `#components`
  (ADR-0008). The real logic lives in `useDialogManagerInstance`, a plain factory the
  specs call directly.
- Storing the instance in a `ref` deep-unwraps it: `isOpen: Ref<boolean>` goes in and
  `isOpen: boolean` comes out, and `props` arrives at the renderer already unwrapped —
  a renderer binds `instance.props`, never `instance.props.value`. The two types cannot
  be reconciled statically, so `registerDialog` carries one deliberate double cast and
  `getDialog` is the only sanctioned way to read a dialog back.

## Open question — where the renderer goes

The renderer needs both `dialogs` and a modal/sheet component, and `@directorkit/ui` today
has neither the primitives (no `Dialog`, `Modal` or `Sheet` — reka-ui's `DialogRoot` is
unused) nor a dependency on this layer. Two shapes, to be settled when the primitives
are built:

- **`ui` extends `dialogs`** and ships `<DDialogManager>`. Cheapest, but the component
  kit then cannot be taken without the dialog layer.
- **A `dialog-ui` bridge layer** extending both, mirroring `form-ui` exactly (ADR-0002).
  Consistent, but `form-ui` earns its existence via `filters`, a real headless consumer
  of `forms`. There is no known headless consumer of `dialogs`, so this may be symmetry
  for its own sake.

Deferred deliberately: the choice is forced by the primitives, and the primitives are
not written.

**One constraint on it, whichever shape wins: the renderer must close through
`closeDialog`, not through the manager.** The renderer this was ported from wires
`@update:open` straight to `manager.removeFromRender(key)`, which bypasses the instance
entirely — so a dialog closed by escape or an overlay click fires no `onClose` and no
`onCloseEvent`, and any opener relying on those to reset its state silently does not.
That is why `isCloseable` defaults to `false` there and the closeable dialogs emit a
`close` event for the caller to handle instead: the bypass is real, and the default hides
it. Copying the wiring would reintroduce the bug fixed above through the back door. The
gap is pinned by a test named *"a close driven the way a renderer drives it never reaches
onClose"* — it asserts today's behaviour, and is meant to be inverted when the renderer
lands.

## Alternatives considered

- **Fold the dialog state into `@directorkit/ui`.** One layer, no placement question. Rejected
  for the reason ADR-0002 rejected it for `forms`: opening a dialog is state, and state
  should not require a component kit. It would also make the layer untestable without
  UnoCSS and reka-ui in the graph.
- **`provide`/`inject` at the app root instead of a plugin.** Would drop the `#app`
  dependency and the test stub. Rejected: it needs a provider component wrapped around
  the app, which is precisely the wrapper this layer exists to avoid, and Nuxt plugins
  are the idiomatic app-wide singleton.
