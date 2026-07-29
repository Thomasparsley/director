# @director/form-ui

The bridge between [`@director/forms`](https://www.npmjs.com/package/@director/forms)
and [`@director/ui`](https://www.npmjs.com/package/@director/ui): `<DForm*>`
components that take a `FormControl` and wire value, error display and
blur → transform/validate, so app code never repeats that plumbing.

## Install

```bash
npm install @director/form-ui
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ["@director/form-ui"],
});
```

```ts
// uno.config.ts — required, inherited from @director/ui
export { default } from "@director/ui/uno.config";
```

Extending this layer pulls in both `@director/ui` and `@director/forms`.
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
