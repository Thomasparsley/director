import type { IdentityUser } from "../types/user";

export type { IdentityLogger as SessionLogger } from "../utils/logger";

/**
 * Explicit session lifecycle. One state field instead of a pair of implicit
 * signals (an `isAuthorized` boolean + a separately-stored expiry).
 *
 * - `unknown`        — before bootstrap has settled (SSR/first load).
 * - `anonymous`      — no user; not logged in.
 * - `authenticating` — a login/fetch-me round-trip is in flight.
 * - `authenticated`  — a user is loaded and authorized.
 * - `expired`        — we had a user, the session died; authorization dropped.
 *                      Landed on from the keep-alive flow and transport auth
 *                      recovery; the user is kept for a re-login prefill.
 */
export type SessionStatus
  = | "unknown"
    | "anonymous"
    | "authenticating"
    | "authenticated"
    | "expired";

export type SessionExpiredReason
  = | "refresh-rejected"
    | "wake-expired"
    | "auth-error"
    | "idle-timeout";

export interface SessionState {
  status: SessionStatus
  user?: IdentityUser
  /**
   * Absolute epoch-ms of the access token's expiry (server `refreshAfter`), or
   * `null` when unknown (e.g. right after a reload before the first refresh).
   */
  expiresAtMs: number | null
  /** Why the session last became `expired`; `null` otherwise. */
  expiredReason: SessionExpiredReason | null
}
