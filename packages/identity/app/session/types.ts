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

/**
 * Why a session ended. Each value is a different sentence for the app to show, so
 * the user is told what actually happened instead of a generic "please sign in again".
 *
 * - `refresh-rejected`     — the server refused to renew a live token (the session
 *                            was revoked, the password changed, or it ran out).
 * - `wake-expired`         — the access token was dead when we came back and there
 *                            was no refresh session left to trade in.
 * - `wake-recovery-failed` — same, but the refresh exchange itself was refused.
 * - `auth-error`           — the transport stopped accepting the token mid-session.
 * - `idle-timeout`         — the keep-alive countdown lapsed; the session was revoked.
 */
export type SessionExpiredReason
  = | "refresh-rejected"
    | "wake-expired"
    | "wake-recovery-failed"
    | "auth-error"
    | "idle-timeout";

/**
 * What came of trading the refresh cookie for a fresh access token. The three are
 * distinct on purpose: `unreachable` is a network failure, not an answer, and must
 * never be read as "the session is over".
 */
export type SessionRecoveryOutcome = "recovered" | "rejected" | "unreachable";

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
