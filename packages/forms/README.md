# @director/forms

A reactive form model for Nuxt: controls, groups, validators and transformers.
Logic-only — it ships **no components**. Pair it with
[`@director/form-ui`](https://www.npmjs.com/package/@director/form-ui) to bind the
model to real inputs, or drive your own.

## Install

```bash
npm install @director/forms
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ["@director/forms"],
});
```

`@director/forms` is a **Nuxt layer**, not a built library: it ships raw source and
the consuming app's Vite compiles it. `nuxt` and `vue` are peer dependencies.

## The model

Four composed abstractions, with state living only at the leaves:

| | |
| --- | --- |
| `useFormControl(initial, options)` | One field: value, status, validators, transformers |
| `useFormGroup(controls)` | A record of controls (or nested groups); aggregates status and data |
| `useArrayFormGroup(factory)` | A growable list of groups — add/remove rows |
| `useKvForm(...)` | A key/value form for dynamic, non-fixed shapes |
| `useFormSubmit(form, handler)` | Validate-then-submit, returning a callback for post-success work |

```ts
const form = useFormGroup({
  email: useFormControl("", {
    validators: [requiredValidator(), emailValidator()],
    transformers: [stringTrimTransformer],
  }),
  age: useFormControl<number | null>(null, {
    validators: [numberRangeValidator({ min: 18 })],
  }),
});

const { executeSubmit, isDisabled, isLoading } = useFormSubmit(form, async data => {
  await $fetch("/api/users", { method: "POST", body: data });
  // Return a function to run only after a successful submit (ADR-0014).
  return () => navigateTo("/users");
});
```

`useFormSubmit` validates before it calls you, guards against double submits, and
drives `isDisabled` / `isLoading` for the button — a form that is untouched, pending
or invalid disables itself.

Three conventions are worth knowing before you write against it:

- **`null` is the empty value.** `undefined` never enters the model, so "untouched"
  and "explicitly cleared" stay distinguishable (ADR-0012).
- **`patch(data, { write: true })` is the hydration primitive** — load an API
  response into a form without marking it dirty (ADR-0011).
- **Validators do one thing each** and come in eager and lazy flavours; the same
  split exists for transformers (ADR-0013).

Batteries included under `validators/` — `requiredValidator`, `emailValidator`,
`valueEqualsToValidator`, `stringMinLengthValidator`, `stringMaxLengthValidator`,
`numberRangeValidator`, `numberPositiveIntegerValidator`, `dateBeforeValidator`,
`dateBeforeOrEqualValidator`, `arrayItemsValidator`, `arrayOneOfValidator`,
`arrayLengthValidator` — and under `transformers/`: `stringTrimTransformer`,
`stringEmptyAsNullTransformer`, `valueEmptyAsNullTransformer`,
`arrayEmptyAsNullTransformer`, `objectEmptyAsNullTransformer`,
`numberEnsureTransformer`.

## Documentation

The model is specified in the [repo's ADRs](https://github.com/Thomasparsley/director/tree/main/docs/adr):
0010 (the forms model) first, then 0011 – 0014.

## License

MIT © Tomáš Petržela
