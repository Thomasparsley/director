# 0012 — null is the empty value; undefined never enters the model

Status: Accepted

## Context

JavaScript has two empties, and a form model touches every place where the
difference bites: reactivity (Vue casts an absent prop), serialization
(`JSON.stringify` drops `undefined` keys but keeps `null` ones), and third-party
`v-model` contracts (reka treats an `undefined` `modelValue` as *absent*).

`050a9e2` is what forced this to be written down. One control declared
`useFormControl<string | undefined>(undefined)`, and it produced **three
independent failures from one value**:

1. *"put reka's SelectRoot into uncontrolled (\"passive\") mode, since it treats an
   undefined modelValue as absent — every model update wrote past the actual
   control."*
2. *"JSON.stringify drops undefined, so the required \"role\" field silently
   vanished from the submitted payload while every other empty field serialized as
   null."*
3. *"This also fixes the repo-wide typecheck, which rejected undefined as reka's
   AcceptableValue doesn't include it."*

The second is the dangerous one: a required field disappearing from a submitted
payload, silently, while every sibling serialized correctly.

## Decision

**`null` is the empty value throughout `@directorkit/forms`.** Declare controls as
`T | null`, initialise with `null`, and let `undefined` exist only at the
boundaries — never in the model.

The transformer set enforces the convention by normalising *to* null while
accepting undefined as input: `valueEmptyAsNullTransformer` (*"Turns null,
undefined, or an empty string into null"*), and the `string`/`array`/`object`
variants. So does the rest of the model: a nullable group with no controls reports
`null` (*"so payloads stay clean"*), `markAsPristine` clears the error to `null`,
and `AllowNull<T, Nullable>` is `T | null` — never `T | undefined`.

**Where `undefined` legitimately appears, it is boundary code converting inwards:**

- `ValidatorResponse` tolerates both, and must: *"A validator signals success by
  returning `null` or `undefined` — both must be treated as 'keep going', not as
  an early exit"* (hence the loose `!=` in `executeValidators`). This is what lets
  a validator fall off the end with no return.
- The `@internationalized/date` converters in `form-ui` return `undefined`,
  because that is what reka's `v-model` wants for "no value" — and
  `dateValueToDate` converts it straight back: *"undefined stays null so
  useDateFormControl coerces it"*.

That is the rule in one line: **undefined may exist at the reka edge; null is what
the model stores.**

## Consequences

- Payloads are predictable. Every empty field serializes as an explicit `null`, so
  a server can distinguish "cleared" from "not sent" — and no required field can
  vanish by omission.
- reka's controlled/uncontrolled detection works, because `modelValue` is never
  `undefined`.
- **The convention is not enforced by types.** Nothing stops
  `useFormControl<string | undefined>` — that is exactly how `050a9e2` happened,
  and it type-checked at the point of declaration. The failure surfaces three
  layers away, in a submitted payload or a silently passive select. A lint rule,
  or a constraint on the control's type parameter, would turn this ADR into
  something the compiler can hold.
- The fix in `050a9e2` was **one line in the playground**; no library code changed.
  That is the tell that this is a convention the library invites you to break.
- `undefined` is still unavoidable in the two boundary cases above, so "null
  everywhere" is not literally true and cannot be. The rule is directional, and
  the conversion sites are the places to look when it goes wrong.

## Alternatives considered

- **`undefined` as the empty value.** More idiomatic in modern TypeScript, and
  what optional properties already mean. Rejected on the serialization failure
  above: an optional field that vanishes from the payload is indistinguishable
  from a field the client never knew about.
- **Allow both and normalise on submit.** Rejected — it just moves the ambiguity
  to the last possible moment, and reka's uncontrolled-mode failure happens long
  before submit.
- **Encode it in the type of `useFormControl`** (reject `undefined` in the type
  parameter). The right answer, and still open. It was not done in `050a9e2`
  because the immediate fix was one character and the constraint needs thought —
  `ValidatorResponse` shows undefined is not uniformly bannable.
</content>
</invoke>
