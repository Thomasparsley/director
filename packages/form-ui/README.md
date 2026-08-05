# @directorkit/form-ui

The bridge between [`@directorkit/forms`](https://www.npmjs.com/package/@directorkit/forms)
and [`@directorkit/ui`](https://www.npmjs.com/package/@directorkit/ui): `<DForm*>`
components that take a `FormControl` and wire value, error display and
blur → transform/validate, so app code never repeats that plumbing.

## Install

```bash
npm install @directorkit/form-ui
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ["@directorkit/form-ui"],
});
```

```ts
// uno.config.ts — required, inherited from @directorkit/ui
export { default } from "@directorkit/ui/uno.config";
```

Extending this layer pulls in both `@directorkit/ui` and `@directorkit/forms`.
It is a **Nuxt layer**, not a built library: it ships raw source and the consuming
app's Vite compiles it. `nuxt` and `vue` are peer dependencies.

## Components

Auto-registered with the `DForm` prefix: `<DFormInput>` `<DFormInputNumber>`
`<DFormSelect>` `<DFormSwitch>` `<DFormPinInput>` `<DFormDateField>`
`<DFormTimeField>` `<DFormDatePicker>`.

```vue
<script setup lang="ts">
const form = useFormGroup({
  email: useFormControl("", { validators: [required(), email()] }),
  plan: useFormControl<string | null>(null),
});
</script>

<template>
  <DFormInput :control="form.controls.email" label="Email" />
  <DFormSelect :control="form.controls.plan" label="Plan" :items="plans" />
</template>
```

Pass the control, not a `v-model`: the component reads its value, its status and its
errors from the model, and writes back on the events the control expects. Labels,
hints and error text render through `<DFormField>`.

`useFormFields(control)` is the wiring itself, if you are writing your own binding:
it normalizes a control — raw or `reactive()`-unwrapped, as it arrives when plucked
from a group in a template — into `{ fieldValue, fieldHasError, fieldError }`.

## License

MIT © Tomáš Petržela
