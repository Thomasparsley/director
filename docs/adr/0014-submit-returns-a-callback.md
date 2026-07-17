# 0014 — `useFormSubmit` returns a callback for post-success work

Status: Accepted

## Context

Submitting a form is never just the request. It is: guard against double-submit,
mark pending, call the API, catch failures, clear pending — and *then* navigate,
toast, and commit the new baseline.

Written the obvious way, the follow-up work lands inside the same `try` as the
request:

```ts
async function onSubmit() {
  await api.save(form.data.value);
  await navigateTo("/users");   // inside the try, while pending is still true
}
```

A `navigateTo` that throws is now reported to the user as *"could not save"* —
after the save succeeded. And it runs while the form still says pending.

## Decision

The submit function returns the follow-up as a callback
(`useFormSubmit.ts:5-11`):

```ts
/**
 * Runs after a successful submit — returned by the submit function so follow-up
 * work (navigation, toasts) only happens when the submit itself succeeded.
 */
export type AfterSuccessSubmitFn = () => Promiseable<void>;
export type FormSubmitFn = () => Promiseable<AfterSuccessSubmitFn | undefined | void>;
```

`onSubmit()` runs inside the `try`/`finally`; the returned `afterFn()` is awaited
**outside both**, after `setPending(false)` has already fired. The structure is the
argument: the callback is not a style preference, it is the only way to be outside
a `try` you did not write.

The idiom, from `scenarios.spec.ts:136-169` — *"server failure keeps the form dirty
for a retry; success saves it"*:

```ts
const submit = useFormSubmit(form, async () => {
  await api.register(form.data.value);
  return () => { form.save(); };   // the new baseline, only if it worked
});
```

Two more decisions ride along:

- **`isDisabled` includes `!isDirty`** — *a pristine form cannot be submitted*.
  Combined with `save()` in the after-callback, the button correctly returns to
  disabled once the submit lands: *"Nothing left to submit — the button should be
  disabled again."*
- **`SubmittableForm` is structural** — *"the structural contract `useFormSubmit`
  needs — fulfilled by `FormGroup` and `KvForm`."* Not `FormControl`, not
  `ArrayFormGroup`: they have no `setPending`.

## Consequences

- Failure is reported for the thing that failed. A save error is a save error; a
  navigation error is not.
- The pending flag means what it says — it is false before any follow-up runs, so
  a toast or a route change never happens against a form that still claims to be
  submitting.
- **The pattern is unusual enough to need this ADR.** `return () => {…}` from a
  submit handler reads as a mistake until you know why; a caller who inlines the
  work instead gets code that *works* and is quietly wrong in the failure path.
- `!isDirty` in `isDisabled` inherits ADR-0010's "dirty = was written": a user who
  types and then manually retypes the original value can still submit. Harmless,
  and the alternative is a deep compare per keystroke.
- `onError` defaults to `console.error` — *"pass your own handler to surface the
  error (toast, logger, …)"*. The default is a silent failure from the user's point
  of view, which is the wrong default for anything shipping; every real form must
  pass a handler.

## Alternatives considered

- **`onSuccess` / `onError` options** on `useFormSubmit`. Conventional and would
  read more obviously. Rejected because the follow-up almost always closes over
  values from the submit itself (the created id, the server's response) — an
  options-object callback would have to receive them through a parameter the
  submit function has no way to type.
- **Return a `Result<T, E>` and let the caller branch** (`@director/common` even
  has the type). Puts the whole `if (result.success)` dance back at every call
  site, which is what this composable exists to remove.
- **Let the caller wrap their own try/catch.** That is the status quo it replaces —
  and it is exactly the code that ends up reporting navigation errors as save
  errors.
</content>
</invoke>
