/**
 * Type guard that allows a type to be nullable or not, based on the `Nullable` boolean parameter.
 * If `Nullable` is `true`, the type `T` will be allowed to be `null`; otherwise, it will not.
 *
 * @template T - The type of the value.
 * @template Nullable - A boolean indicating whether the type `T` should be allowed to be `null`.
 *
 * @returns A type that is either `T | null` or `T`, depending on the value of `Nullable`.
 */
export type AllowNull<T, Nullable extends boolean> = Nullable extends true ? T | null : T;
