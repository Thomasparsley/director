import { computed, isReadonly, isRef, ref, type Ref } from "vue";

import type { MaybeRef } from "../types/ref";

/**
 * Normalizes a plain value or a ref into a writable ref.
 *
 * A plain value is wrapped in a new ref. A writable ref is returned as-is, so writes
 * flow back to the caller's ref. A readonly ref is wrapped in a computed whose setter
 * is a no-op — writing to it is silently ignored instead of throwing a Vue warning.
 */
export function useMaybeRef<T, S = T>(value: MaybeRef<T, S>): Ref<T, S> {
  if (!isRef(value)) {
    return ref(value) as Ref<T, S>;
  }

  if (!isReadonly(value)) {
    return value;
  }

  return computed({
    get: () => value.value,
    set: () => { },
  });
}
