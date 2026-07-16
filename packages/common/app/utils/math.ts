/**
 * Linearly interpolates between two numbers `a` and `b` based on the value of `n`.
 *
 * @param a The first number to interpolate from.
 * @param b The second number to interpolate to.
 * @param n The interpolation factor, where 0 represents `a` and 1 represents `b`.
 * @returns The interpolated value between `a` and `b` based on the value of `n`.
 */
export function lerp(a: number, b: number, n: number): number {
  return (1 - n) * a + n * b;
}

/**
 * Converts a value from its original range (between `min` and `max`) to a percentage (between 0 and 100).
 *
 * @param min The lower bound of the original range.
 * @param max The upper bound of the original range.
 * @param value The value to be converted to a percentage.
 * @returns The percentage value between 0 and 100, inclusive.
 */
export function toPercentage(min: number, max: number, value: number): number {
  return (value - min) / (max - min);
}

// TODO: docs
export function getRandomIntBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
