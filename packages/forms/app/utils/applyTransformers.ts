import type { TransformerFn } from "../types/transformer";

/**
 * Applies a series of transformers to a value, in order.
 */
export function applyTransformers<T>(value: T, transformers: Array<TransformerFn<T>>): T {
  return transformers.reduce((acc, transformer) => transformer(acc), value);
}
