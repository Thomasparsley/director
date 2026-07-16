/**
 * Turns an empty (or missing) array into null; non-empty arrays pass through.
 */
export function arrayEmptyAsNullTransformer<T>(value: Array<T> | null | undefined): Array<T> | null {
  if (!value || value.length === 0) {
    return null;
  }

  return value;
}
