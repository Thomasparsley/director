/**
 * Turns null, undefined, or an empty string into null; anything else passes through.
 */
export function valueEmptyAsNullTransformer<T>(value: T | null | undefined): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string" && value.length === 0) {
    return null;
  }

  return value;
}
