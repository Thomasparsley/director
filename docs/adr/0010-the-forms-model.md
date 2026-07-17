# 0010 — The forms model: four composed abstractions, state only at the leaves

Status: Accepted

## Context

`@director/forms` (`37c149f`) is a rewrite of firesport's forms layer, taken as an
opportunity to settle the model rather than port it verbatim. The requirement is a
form model with no components (ADR-0002) that can describe a whole admin payload —
fixed-shape objects, repeated sections, dynamic dictionaries, optional
sub-objects — and hydrate from and submit to an API.

## Decision

### Four abstractions, one base, composed by spread

| abstraction | shape | constructor knob |
| --- | --- | --- |
| `FormControl<T, S>` | one writable value | — |
| `FormGroup<T, Nullable>` | fixed-shape record of items | `constructor?` (nullable groups) |
| `ArrayFormGroup<TForm>` | resizable list of same-shape groups | `constructor(index)` |
| `KvForm<K, TForm>` | dynamic dictionary, keys unknown ahead of time | `builder?(key, value)` |

All four extend `FormBase` — but by **composition, not inheritance**: each
composable builds its own status/state/validation and spreads
`...useFormBase(status, { ...state, ...validation })` into its return. Groups
nest arbitrarily; `scenarios.spec.ts:174-290` composes all four into one order
form and hydrates it from a single API payload.

### State lives only at the leaves

Only `useFormControl` holds real state — `originalData`, `data`, `wasTouched`,
`error` are refs (`useFormControl.ts:103-106`). Every group, array and dictionary
holds a ref for its **controls collection** and derives `data` as a `computed` that
reads its children. There is exactly one copy of any value, in the control that
owns it; a group's `data` is a view.

A control's backing ref may be supplied by the caller
(`useMaybeRef`, `packages/common/app/composables/ref.ts:12-25`): *"A writable ref
is returned as-is, so writes flow back to the caller's ref. A readonly ref is
wrapped in a computed whose setter is a no-op — writing to it is silently ignored
instead of throwing a Vue warning."*

### Status is the single source of truth

`FormStatus` is a const object (`PRISTINE`/`DIRTY`/`PENDING`/`ERROR`), not a TS
enum. `isPristine`/`isDirty`/`hasError`/`isPending` are all *derived* from it —
views, not state.

Aggregation has one rule (`useFormStatus.ts:25-26`): *"Pending wins over
everything (a pending child makes the whole tree pending), then error, then dirty;
a collection with no items is pristine."*

**"Dirty" means "was written", not "differs from original."** A control's status is
error → touched → pristine, and `wasTouched` is a one-way flag. Typing a value and
then typing the original back leaves the control DIRTY. There is no `touched` in
the public API.

### `FormControl<T, S>`: the read type and the write type are separate

A control reads `T` and accepts `S` on writes and patches. `useDateFormControl` is
the canonical case: *"always reads a `Date` but accepts `Date | string | null` on
writes and patches — convenient for date inputs and API payloads"*. It wraps
rather than extends, overriding only the two write paths.

Its trick for absence is worth naming: `new Date(value ?? "")` yields an Invalid
Date, which `requiredValidator` already treats as empty — so the read type stays
`Date` unconditionally and "no date" needs no null branch.

This is why the type layer has `InnerFormType<T>` (read) *and*
`InnerFormSetterType<T>` (write) as near-identical twins differing in one branch,
and why `PatchForm<T> = DeepPartial<InnerFormSetterType<T>>`.

## Consequences

- No synchronisation. A group cannot disagree with its controls, because it does
  not store anything to disagree with.
- **The type layer is heavy, and doubles twice.** `InnerFormType` must check every
  abstraction *and* its `reactive()`-unwrapped twin — a control plucked from a
  group in a template arrives as `UnwrapRef<FormControl<T>>`, structurally
  different from `FormControl<T>`. Hence `Unwraped*` branches and `MaybeUnwraped*`
  aliases throughout, and `useFormFields` in `form-ui` doing the same job at
  runtime (`isRef(control.data)` → proxy or passthrough). Four abstractions × two
  unwrap states × two read/write mapped types is the cost of the model.
  `innerFormTypes.ts:13-16` warns that branch order is load-bearing: *"every
  abstraction is checked from the most specific interface to the least specific
  one, and a record of controls is the fallback."*
- Three escape hatches are documented where the types give out — invariance in
  `ArrayFormGroup` (*"`any` on purpose: FormGroup is invariant in its controls
  type"*), generic-record indexing in `KvForm`, and `NoInfer` in `useFormControl`
  (*"otherwise a literal initial value (\"John\") combined with validators locks T
  to the literal type"*).
- **"Dirty = was written" is a real semantic choice with a visible consequence**:
  `useFormSubmit` disables submit on `!isDirty` (ADR-0014), so a user who undoes
  their edit by hand can still submit. Comparing against `originalData` would need
  a deep equality check on every keystroke; the flag is a deliberate trade.
- The composition-by-spread style means there is no class hierarchy to navigate,
  but also no single place where `FormBase` is implemented once — each composable
  assembles its own.

## Alternatives considered

- **A schema library (zod/valibot/yup) as the model.** Excellent at validation,
  but they describe *data*, not *form state* — there is no place for
  touched/pending/original, no `ArrayFormGroup` with a constructor, and no
  per-field error storage. They could still back `Validator<T>` at the leaves
  later; nothing here forecloses that.
- **VeeValidate / FormKit.** Both bring components, which `@director/forms` may
  not have (ADR-0002) — `@director/filters` is a non-UI consumer.
- **`reactive()` state on the group, controls as views.** The mirror image. Rejected:
  it puts the single copy of a value furthest from the thing that edits it, and
  `useMaybeRef`'s caller-owned-ref case becomes impossible.
</content>
</invoke>
