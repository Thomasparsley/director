/**
 * Turns an empty (or missing) object into null; objects with keys pass through.
 */
export function objectEmptyAsNullTransformer<T extends object>(value: T | null | undefined): T | null {
  if (!value || Object.keys(value).length === 0) {
    return null;
  }

  return value;
}
