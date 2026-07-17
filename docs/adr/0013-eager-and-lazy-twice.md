# 0013 — Eager and lazy, twice; and validators that do one thing

Status: Accepted

## Context

Two problems that look alike and are not:

- **Transformers.** `stringTrimTransformer` on every write eats the space the user
  is typing mid-word. Trimming has to happen, just not on every keystroke.
- **Validators.** A validator can be a regex or a server round-trip. Firing a
  uniqueness check on a field that is empty and already failing
  `requiredValidator` is a wasted request and a confusing error.

Both got the same adjective and different reasons, which is worth pinning down so
the pairing is not mistaken for one mechanism.

## Decision

### Transformers: eager vs lazy is a **UX** distinction

- `transformers` — *"applied to every write of the control's value"* (inside the
  writer, so `patch()` runs them too).
- `lazyTransformers` — *"applied only when `transform()` is called (e.g. on
  blur)"*.

`transform()` writes directly, bypassing the writer, so it does **not** mark the
control touched. `stringTrimTransformer` is a lazy transformer; the UI fires it on
blur. `scenarios.spec.ts:68` pins the sequence: *"blur-style lazy transform cleans
up input before validation"*.

### Validators: eager vs lazy is a **cost** distinction

*"`validators` run first, `lazyValidators` only when all of them pass — use lazy
for expensive checks (e.g. server calls)"*. The gate is one `??`:
`(await executeValidators(value, validators)) ?? (await executeValidators(value, lazyValidators))`.

Validators are **async by signature** (`(value: T) => Promiseable<ValidatorResponse>`)
whether or not they need to be, so a server check needs no different plumbing.
Errors are a `ValidationError` class carrying a message, not a bare string.

Two entry points: `onlyValidate()` *"returns the first error without touching the
form's error state"*; `validate()` *"stores the result"*. Collections differ
deliberately: *"`onlyValidate` short-circuits on the first error; `validate` always
runs on every item so each stores its own error."*

### Presence and relation are separate validators

A relational rule never reports "missing". `dateBeforeValidator` takes a **thunk**
for its bound, *"evaluated lazily at validation time"*, and *"when the bound or the
value is not a valid date, validation is skipped — combine with `requiredValidator`
to enforce presence"*.

`scenarios.spec.ts:325-332` is the reason: *"The end date is required and empty —
but the cross-field rule must not fire while its bound is unset."* Otherwise an
empty end date produces "Start must be before the end" on the **start** field —
an error pointing at the wrong input.

The thunk is also what makes cross-field validation need no subscription: the
validator reads the other control's `.data.value` when it runs.

## Consequences

- Typing feels right — no cursor jumps, no trimming mid-word — and expensive
  checks fire only against values that are already shape-valid.
- **Who calls `transform()` is the UI's problem**, and the UI is inconsistent
  about it. `form-ui`'s `input`/`inputNumber` call `transform()` then `validate()`
  on blur; `dateField`, `timeField`, `datePicker` and `switch` call `validate()`
  only. Defensible — those values round-trip through a converter — but it is a
  divergence with no rule written down, and a lazy transformer on a date control
  would silently never run.
- "Blur" is per-widget and each component names its equivalent: select validates
  *"when the listbox closes, the select's equivalent of blur"*; datePicker when
  the calendar closes; switch on every change because *"a toggle has no meaningful
  blur"*. Sensible per widget, but there is no single answer to "when does this
  form validate?".
- The `??` gate means a lazy validator cannot run while any eager one fails — so
  a field can only ever show one *class* of error at a time. Intended, and it
  means eager/lazy ordering is a real API decision per field, not a hint.
- `null`-vs-`undefined` tolerance in `ValidatorResponse` is the one sanctioned
  exception to ADR-0012, and it exists so validators can fall off the end.

## Alternatives considered

- **One transformer list, applied on write.** Simplest, and wrong: it is the
  trim-eats-your-space bug.
- **One validator list, all eager.** Fine until the first server-backed check;
  then every keystroke is a request. Debouncing addresses the rate but not the
  ordering — you would still be asking the server about an empty field.
- **Validators that take a value instead of a thunk** for cross-field bounds.
  Requires the validator list to be rebuilt whenever the other field changes, or a
  watcher per relation. The thunk is one closure and reads the live value.
- **Relational validators that also enforce presence.** Fewer validators per
  field, at the price of errors that name the wrong input.
</content>
</invoke>
