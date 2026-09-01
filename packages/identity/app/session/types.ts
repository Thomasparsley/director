import type { LoginFailure } from "../errors/identityApiErrors";
import type { IdentityUser } from "../types/user";

export type { IdentityLogger as SessionLogger } from "../utils/logger";

/**
 * Explicit session lifecycle. One state field instead of a pair of implicit
 * signals (an `isAuthorized` boolean + a separately-stored expiry).
 *
 * A const object rather than a bare union: the members get a name a call site can
 * import, so a typo becomes a compile error instead of a comparison that is
 * quietly always false — which for `status !== Unknown` would mean rendering a
 * visitor as logged out for ever.
 */
export const SessionStatuses = {
  /** Before bootstrap has settled (SSR / first load). Nobody has answered yet. */
  Unknown: "unknown",
  /** No user; not logged in. */
  Anonymous: "anonymous",
  /** A login / fetch-me round-trip is in flight. */
  Authenticating: "authenticating",
  /** A user is loaded and authorized. */
  Authenticated: "authenticated",
  /**
   * We had a user, the session died and could not be recovered; authorization
   * dropped. Landed on from the keep-alive flow and transport auth recovery;
   * the user is kept for a re-login prefill.
   */
  Expired: "expired",
} as const;

export type SessionStatus = typeof SessionStatuses[keyof typeof SessionStatuses];

/**
 * Why a session ended. Each value is a different sentence for the app to show, so
 * the user is told what actually happened instead of a generic "please sign in again".
 */
export const SessionExpiredReasons = {
  /**
   * The server refused to renew a live token — the session was revoked, the
   * password changed, or it ran out.
   */
  RefreshRejected: "refresh-rejected",
  /**
   * The access token was dead when we came back to the tab and there was no
   * refresh session left to trade in.
   */
  WakeExpired: "wake-expired",
  /** Same as above, but the refresh exchange itself was refused. */
  WakeRecoveryFailed: "wake-recovery-failed",
  /** The transport stopped accepting the token mid-session. */
  AuthError: "auth-error",
  /** The keep-alive countdown lapsed; the session was revoked. */
  IdleTimeout: "idle-timeout",
} as const;

export type SessionExpiredReason = typeof SessionExpiredReasons[keyof typeof SessionExpiredReasons];

/**
 * What came of trading the refresh cookie for a fresh access token. The three are
 * distinct on purpose: `Unreachable` is a network failure, not an answer, and must
 * never be read as "the session is over".
 */
export const SessionRecoveryOutcomes = {
  Recovered: "recovered",
  Rejected: "rejected",
  Unreachable: "unreachable",
} as const;

export type SessionRecoveryOutcome = typeof SessionRecoveryOutcomes[keyof typeof SessionRecoveryOutcomes];

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

/**
 * How an attempt to load the current user ended. The three arms exist because the
 * session machine has to tell an *answer* from a *silence*:
 *
 * - `Ok`          — a user came back.
 * - `Rejected`    — the API answered, and the answer is "this identifies nobody".
 *                   That settles the session anonymous, on the server too.
 * - `Unavailable` — no answer arrived: the backend was unreachable, the request
 *                   timed out, the response was malformed. Nothing has been
 *                   learned, so the session stays `unknown` during SSR and the
 *                   client tries again.
 *
 * Collapsing the last two — which an ordinary `{ success: false }` does — is what
 * makes a stale token and an unreachable backend indistinguishable, and leaves a
 * server-rendered page claiming a logged-in user is anonymous (or the reverse).
 *
 * The failure arms keep the whole {@link LoginFailure} beside the classification,
 * so a caller that only wanted the code — and the detail next to it, such as a
 * rate limit's `retryAfterSeconds` — loses nothing to the extra field.
 */
export const FetchUserOutcomes = {
  Ok: "ok",
  Rejected: "rejected",
  Unavailable: "unavailable",
} as const;

export type FetchUserOutcome
  = | { readonly status: typeof FetchUserOutcomes.Ok, readonly user: IdentityUser }
    | ({ readonly status: typeof FetchUserOutcomes.Rejected } & LoginFailure)
    | ({ readonly status: typeof FetchUserOutcomes.Unavailable } & LoginFailure);
