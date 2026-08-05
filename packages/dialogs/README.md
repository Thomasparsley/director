# @directorkit/dialogs

Hand a component to `useModalDialog` / `useSheetDialog` and open it from anywhere —
no `v-if` at the call site, no wrapper element, no dialog markup near the page that
opens it. The layer owns dialog **state**; painting it is the consumer's job.

## Install

```bash
npm install @directorkit/dialogs
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ["@directorkit/dialogs"],
});
```

`@directorkit/dialogs` is a **Nuxt layer**, not a built library: it ships raw source and
the consuming app's Vite compiles it. `nuxt` and `vue` are peer dependencies.

## Use it

```ts
const editTeam = useModalDialog<Props, { saved: [] }>(EditTeamDialog, {
  props: computed(() => ({ teamId: teamId.value })),
  emits: { saved: () => editTeam.closeDialog() },
  isCloseable: true,
});

editTeam.openDialog();
```

You get back `{ isOpen, openDialog, closeDialog, onCloseEvent }`. Props are reactive
— pass a `computed`, and the dialog re-renders with them. Emits are the handlers the
component's events land in, which is also how a dialog resolves a value back to its
opener (`choose: value => { result.value = value; picker.closeDialog(); }`).
`onCloseEvent` fires however the dialog was dismissed. TypeScript enforces the pair:
a component with no props takes no `props` key at all, rather than an empty object.

`useSheetDialog` is the same API for a sheet, plus `direction` (`"right"` by
default). Both accept `isCloseable`, `withPadding`, `onClose`, and
`unregisterOnUnmount: false` for a dialog that must outlive the component that
opened it.

## Painting the dialogs

The layer registers state, not markup — it ships no components. Write one host near
the root of your app and render the manager's open instances through it:

```vue
<!-- app/components/DialogHost.vue — mounted once, near the root -->
<script setup lang="ts">
const manager = useDialogManager();
const dialogInstances = manager.instances; // the dialogs worth painting, in open order

function close(entry: (typeof dialogInstances)["value"][number]): void {
  entry.instance.isOpen = false;
  manager.removeFromRender(entry.key);
}
</script>

<template>
  <template v-for="(entry, index) in dialogInstances" :key="entry.key">
    <YourOverlay
      v-if="entry.instance.isOpen"
      :style="{ zIndex: 100 + index }"
      @dismiss="entry.instance.isCloseable && close(entry)"
    >
      <component
        :is="entry.instance.component"
        v-bind="(entry.instance.props ?? {}) as Record<string, unknown>"
        v-on="(entry.instance.emits ?? {}) as Record<string, (...args: Array<unknown>) => void>"
      />
    </YourOverlay>
  </template>
</template>
```

`YourOverlay` is whatever you paint with — reka-ui's `Dialog`, `vaul-vue` for sheets,
your own markup — and escape-to-close, overlay-to-close and stacking order are yours
to define. Note that the manager's `ref` deep-unwraps each instance, so `isOpen` is a
plain boolean here and `props` / `emits` arrive typed as `unknown`. A closed dialog
stays in `instances` briefly so its close transition can play out.

The playground's `DialogHost.vue` is a complete worked example, including escape
handling.

## Documentation

See [ADR-0017](https://github.com/Thomasparsley/director/blob/main/docs/adr/0017-dialogs-hold-state-not-paint.md)
for why the state/paint split is where it is.

## License

MIT © Tomáš Petržela
