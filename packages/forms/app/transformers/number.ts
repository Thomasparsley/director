/**
 * Coerces the value into a number: numbers pass through, numeric strings are parsed,
 * anything else becomes 0.
 */
export function numberEnsureTransformer(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return parseFloat(value);
  }
  return 0;
}
