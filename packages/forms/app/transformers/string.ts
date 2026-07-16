/**
 * Trims a string; null/undefined becomes an empty string.
 */
export function stringTrimTransformer(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.trim();
}

/**
 * Turns an empty string into null; other values pass through.
 */
export function stringEmptyAsNullTransformer(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.length === 0) {
    return null;
  }

  return value;
}
