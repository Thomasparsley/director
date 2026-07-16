/**
 * A transformer maps a form value onto a normalized form value (trim, coerce, …).
 */
export type TransformerFn<T> = (value: T) => T;
