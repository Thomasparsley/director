/**
 * Normalizes whitespace inside a date/time literal segment. Node and browser ICU disagree
 * on which space precedes the day period ("9:30 AM" uses U+202F in newer ICU, U+0020 in
 * older), which would make every SSR'd time field a hydration mismatch.
 */
export function formatSegmentLiteral(value: string): string {
  return value.replace(/\s+/g, " ");
}
