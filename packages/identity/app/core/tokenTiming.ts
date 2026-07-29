/**
 * Pure token-timing math. No Nuxt/Vue/DOM — everything is computed from
 * absolute millisecond timestamps so it can be unit-tested with plain numbers.
 *
 * The server reports the token's expiry as `refreshAfter`; there is no separate
 * refresh window, so the client must renew before that instant or fall back to
 * a full re-login.
 */

export interface RefreshScheduleOptions {
  /** Renew this many ms before expiry. */
  readonly leadMs: number
  /** Never schedule a refresh sooner than this from now. */
  readonly minDelayMs: number
}

/** Has the token reached or passed its expiry at `nowMs`? */
export function isTokenExpired(expiresAtMs: number, nowMs: number): boolean {
  return nowMs >= expiresAtMs;
}

/**
 * Is the token within its lead window (or already expired) at `nowMs`, i.e.
 * should it be renewed right now rather than later?
 */
export function isWithinRefreshWindow(
  expiresAtMs: number,
  nowMs: number,
  leadMs: number,
): boolean {
  return nowMs >= expiresAtMs - leadMs;
}

/**
 * Milliseconds to wait before the next proactive refresh. Returns `minDelayMs`
 * when the token is already inside its lead window (including when expired), so
 * callers get a bounded, non-negative delay they can hand straight to a timer.
 */
export function computeRefreshDelayMs(
  expiresAtMs: number,
  nowMs: number,
  { leadMs, minDelayMs }: RefreshScheduleOptions,
): number {
  const idealDelay = expiresAtMs - leadMs - nowMs;
  return Math.max(idealDelay, minDelayMs);
}

/**
 * Milliseconds remaining until `expiresAtMs`, floored at 0. Used to drive the
 * keep-alive countdown and to clamp it so the dialog never claims more time
 * than the token actually has.
 */
export function timeUntilExpiryMs(expiresAtMs: number, nowMs: number): number {
  return Math.max(expiresAtMs - nowMs, 0);
}

/**
 * Parse a server `refreshAfter`/expiry string into an absolute ms timestamp.
 * Returns `null` for missing or unparseable input instead of `NaN`, so callers
 * can treat "unknown expiry" explicitly.
 */
export function parseExpiry(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}
