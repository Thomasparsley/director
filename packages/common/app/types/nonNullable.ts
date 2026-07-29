/**
 * Strips `null` and `undefined` from every field of `T`, one level deep.
 *
 * Useful at a boundary that has already proven the nullable fields are present —
 * a GraphQL payload whose error branch was handled, say — so the rest of the code
 * reads the object without re-narrowing each field.
 *
 * @template T - The object type whose fields should become non-nullable.
 */
export type NonNullableFields<T> = {
  [K in keyof T]-?: NonNullable<T[K]>
};
