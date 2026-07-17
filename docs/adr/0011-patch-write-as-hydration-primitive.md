# 0011 — `patch(data, { write: true })` is the API-hydration primitive

Status: Accepted

## Context

Every edit form in an admin does the same thing: construct empty, fetch, fill in,
let the user edit, allow reset, submit, and then treat the submitted values as the
new baseline.

Naively filling a form by assigning values makes it look **user-modified** — the
submit button lights up before the user has touched anything, and `reset()` snaps
back to the *construction-time* empty state rather than to what was loaded. Both
are wrong, and both are the default.

## Decision

One `patch(data, options)` on every abstraction, with two escalating flags
(`types/patching.ts:15-32`):

- **`asPristine`** — *"the form is considered untouched (pristine) after the patch
  is applied. Useful when programmatically filling a form without flagging it as
  user-modified."*
- **`write`** — *"behaves like loading a fresh form instance: values are applied,
  the form is marked pristine, AND the original data is overwritten — so a later
  `reset()` returns to the patched values, not the ones from construction time."*

`write` implies `asPristine`. **`{ write: true }` is what you use to load an API
response**; `scenarios.spec.ts:40-54` states the requirement as a test — *"Loading
API data must not make the form look user-modified, and reset must return HERE, not
to the empty construction state."*

The counterpart is `save()`, which *"commits the current data as the new original
data and marks the form pristine"* — the same move, after a successful submit
rather than after a load (ADR-0014).

### The patch shape is the data shape

`PatchForm<T> = DeepPartial<InnerFormSetterType<T>>` — the payload you patch and
the payload `form.data` produces are the same shape. One `form.patch(apiPayload,
{ write: true })` hydrates a tree of controls, arrays, nullable groups and
dictionaries, and `form.data.value` then equals the payload
(`scenarios.spec.ts:214`).

Per-abstraction semantics are fixed and each is tested:

- **Group** — key by key; **unknown keys are silently skipped**. A null nullable
  group is constructed first if it has a constructor, otherwise the patch is
  dropped.
- **ArrayFormGroup** — *"existing groups are patched in place, missing groups are
  built via the constructor, and surplus groups are dropped."*
- **KvForm** — unknown keys go through `config.builder`; *"without a builder,
  patches for unknown keys are ignored."*

Patching goes through the control's writer, so **eager transformers run on patch**
(ADR-0013). `reset()` deliberately does not: *"Writes the raw original value back,
bypassing transformers on purpose: the original value already went through them
(or predates them by design)"*.

## Consequences

- The whole load/edit/reset/save lifecycle is four calls — `patch(…, {write:true})`,
  `reset()`, `save()`, `markAsPristine()` — and they compose at every depth.
- **Unknown keys are silently skipped, at every level.** An API that adds a field,
  or a typo'd key in a patch payload, is a no-op rather than an error. That is
  what makes `patch(apiPayload)` safe to call with a whole server response — and
  it is also a silent failure mode with no diagnostic. Deliberate, but it will
  cost someone an afternoon.
- Three flags is a small vocabulary that must be learned: patching without them is
  "the user typed this", `asPristine` is "fill it quietly", `write` is "this is
  now the truth". Choosing wrong yields a form that resets to the wrong place —
  a bug that only shows up on the reset button.
- Array patching **drops surplus groups**, so a patch is a replace, not a merge, in
  the length dimension. Right for hydration, surprising if used as an incremental
  update.
- The `isArray` config exists to serve this API: *"When true, patched scalar values
  are coerced into single-item arrays"*, defaulting to whether the initial value
  was an array — so a query param that arrives as a scalar can patch a multi-value
  control. That is filters' need (ADR-0015) reaching into the forms model.

## Alternatives considered

- **A separate `load()` / `hydrate()` method** distinct from `patch()`. Clearer at
  the call site than a boolean. Rejected because the traversal, the constructor
  calls and the array reconciliation are identical — it would be `patch` with a
  flag pre-set, and the flag would still exist on the composite path.
- **Re-constructing the form once the data arrives**, instead of patching. The
  usual Vue answer, and it makes "original" trivially correct. Rejected: the form
  is built in `setup`, and the template already holds references to its controls;
  swapping the instance underneath means every binding, every `v-model` and every
  child component sees a new object.
- **Deep-comparing against `originalData`** to derive dirtiness instead of tracking
  a flag — would make `asPristine` unnecessary. See ADR-0010: rejected on the cost
  of comparing on every keystroke.
</content>
</invoke>
