---
"@directorkit/dialogs": patch
---

`useModalDialog` / `useSheetDialog` now accept a component whose props type is a
discriminated union.

`DialogConfig` asked `TProps extends undefined ? { props?: undefined } : { props:
ComputedRef<TProps> }`. `TProps` is a naked type parameter there, so the conditional
distributes: given `A | B` it resolved to `{ props: ComputedRef<A> } | { props:
ComputedRef<B> }` and then accepted neither arm, because a `ComputedRef<A | B>` — which
is what a `computed` over a union of states actually produces — is assignable to neither
`ComputedRef<A>` nor `ComputedRef<B>`. The error blamed the call site, and the only way
out was to flatten the component's props into one interface with the variant-specific
half made optional, which throws away exactly the guarantee the union was there to give.

Both arms are now written `[TProps] extends [undefined]` / `[TEmits] extends
[undefined]`, which checks the union as a whole instead of member by member. The
`undefined` case is unchanged: a dialog with no props still takes no `props` key.
