import type { ErrorResult, Result } from "#layers/director-common/app/types/result";

import { LoginErrorResults, RefreshErrorResults } from "../errors/identityApiErrors";
import type { LoginCredentialsRequest } from "../types/api";
import type { IdentityTokenApi } from "../types/identityApi";
import type { IdentityUser } from "../types/user";
import { noopIdentityLogger } from "../utils/logger";

import type { useSessionStore } from "./store";
import type { SessionLogger, SessionRecoveryOutcome } from "./types";

export type LoginOutcome
  = | { readonly status: "OK" }
    | { readonly status: "ALREADY_AUTHORIZED" }
    | { readonly status: "MFA_REQUIRED", readonly challengeId: string, readonly mfaType: string };

export interface SessionServiceDeps {
  store: ReturnType<typeof useSessionStore>
  api: IdentityTokenApi
  /**
   * Fetches the currently-authenticated user (the `me` call). Injected so the
   * service stays free of any data-fetching internals and can be unit-tested
   * with a plain fake.
   */
  fetchUser: () => Promise<Result<IdentityUser, LoginErrorResults>>
  logger?: SessionLogger
  /**
   * Default for `bootstrap`'s `canRecover` when the caller gives no hint. The Nuxt
   * wiring passes `() => import.meta.client` — only the browser holds the cookie
   * jar a rotated refresh token has to be written back into.
   */
  canRecoverByDefault?: () => boolean
}

/**
 * The identity state machine. Owns every transition between anonymous /
 * authenticating / authenticated and the token lifecycle side of login,
 * refresh and logout. All effects (HTTP, user fetch, state) are injected, so
 * the flows are deterministic and testable without module mocking.
 */
export function createIdentitySession({
  store,
  api,
  fetchUser,
  logger = noopIdentityLogger,
  canRecoverByDefault = () => true,
}: SessionServiceDeps) {
  /**
   * Loads the current user into the store. Skips the network when no token
   * cookie is present unless `force` is set (used right after login, when the
   * server has just set the cookie but the reactive read may not reflect it).
   */
  async function fetchMe(force = false): Promise<ErrorResult<LoginErrorResults>> {
    if (!force && !store.hasAccessToken.value) {
      return { success: false, error: LoginErrorResults.IsNotAuthorizedForUserData };
    }

    const result = await fetchUser();
    if (!result.success) {
      logger.error("Identity self query failed", result.error);
      return { success: false, error: result.error };
    }

    store.setAuthenticated(result.value);
    logger.log("Authenticated user:", result.value);
    return { success: true };
  }

  const refetchMe = () => fetchMe(true);

  /** Kept for the challenge flow: apply-token happens first, then load the user. */
  const authenticate = () => fetchMe(true);

  /**
   * Captures how to settle if this login attempt does not end authenticated. A
   * re-login from `expired` must land back on `expired`: that state keeps the user
   * for the form's prefill, and it is what the re-login dialog stays open on — one
   * mistyped password must not collapse it to `anonymous`.
   */
  function captureFailureSettler(): () => void {
    const previousStatus = store.status.value;
    const previousReason = store.expiredReason.value;
    if (previousStatus === "expired" && previousReason) {
      return () => store.setExpired(previousReason);
    }
    return () => store.setAnonymous();
  }

  async function login(
    credentials: LoginCredentialsRequest,
  ): Promise<Result<LoginOutcome, LoginErrorResults>> {
    if (store.isAuthorized.value) {
      return { success: true, value: { status: "ALREADY_AUTHORIZED" } };
    }

    const settleFailure = captureFailureSettler();
    // Drop any dead token before authenticating — but only past the check above:
    // clearing while authorized would strand a live session with no marker cookie,
    // stopping renewal and tripping the next wake resync into a bogus expiry.
    store.clearToken();
    store.setAuthenticating();

    const loginResult = await api.sendLoginRequest(credentials);
    if (!loginResult.success) {
      settleFailure();
      return loginResult;
    }

    if (loginResult.value.status === "MFA_REQUIRED") {
      logger.log("Login requires MFA", loginResult.value.challengeId);
      // Credentials accepted but not yet authorized — the caller drives the MFA
      // dialog and completes via the challenge flow.
      settleFailure();
      return {
        success: true,
        value: {
          status: "MFA_REQUIRED",
          challengeId: loginResult.value.challengeId,
          mfaType: loginResult.value.mfaType,
        },
      };
    }

    store.applyExpiry(loginResult.value.refreshAfter);

    const authResult = await fetchMe(true);
    if (!authResult.success) {
      // A fresh session was established, so whatever came before no longer describes
      // reality — settle anonymous rather than back to a stale `expired`.
      store.setAnonymous();
      return authResult;
    }

    return { success: true, value: { status: "OK" } };
  }

  async function refreshAccessToken(): Promise<void> {
    const result = await api.sendRefreshAccessTokenRequest();
    if (!result.success) {
      if (result.error === RefreshErrorResults.Unauthorized) {
        // The session is dead server-side and cannot self-renew. Drop the token
        // and mark the session `expired` (keeping the user for a re-login
        // prefill) rather than silently going anonymous — the token lifecycle
        // observes the cleared token and surfaces the re-login dialog.
        logger.warn("Access token refresh rejected as unauthorized, session expired");
        store.clearToken();
        store.setExpired("refresh-rejected");
        return;
      }

      logger.error("Failed to refresh access token", result.error);
      // Transient failure — throw so the refresh loop's retry/backoff engages.
      throw new Error(`Failed to refresh access token (error ${result.error})`);
    }

    store.applyExpiry(result.value.refreshAfter);
    logger.debug("Access token refreshed");
  }

  /** Best-effort server-side revoke; never rejects. */
  async function sendLogout(): Promise<void> {
    try {
      await api.sendLogoutRequest();
    }
    catch (error) {
      logger.warn("Logout request failed", error);
    }
  }

  /**
   * Ends the session server-side without touching local state.
   *
   * The idle keep-alive lapse needs this: unlike every other expiry reason, an idle
   * timeout fires while the server session is still perfectly alive. Without a revoke
   * the timeout would be cosmetic — the httpOnly tokens stay valid in the jar — while
   * dropping the local refresh marker would throw away a session the server never
   * ended, forcing a credential re-entry it never asked for.
   */
  async function revokeSession(): Promise<void> {
    await sendLogout();
    logger.log("Session revoked server-side");
  }

  async function logout(): Promise<void> {
    // Clear local auth state unconditionally: even if the server call fails the
    // user asked to log out, so the UI must not stay "logged in".
    await sendLogout();
    store.clearToken();
    store.setAnonymous();
    logger.log("User logged out");
  }

  let bootstrapPromise: Promise<void> | null = null;

  /**
   * Releases the single-flight latch so the next `bootstrap()`/`whenSettled()` runs a
   * fresh attempt. Used when an attempt settled nothing because the server could not
   * be reached — re-running is the whole point of leaving the session `unknown`.
   */
  function allowBootstrapRetry(): void {
    bootstrapPromise = null;
  }

  /**
   * The "stay logged in across a browser restart" path. With no access token but a refresh cookie
   * still in the jar, trade it for a fresh access token before asking who we are.
   *
   * Deliberately calls the API directly instead of `refreshAccessToken()`: a rejection here means
   * the long-lived session simply ran out, which is a plain logged-out state, not the `expired` one
   * that pops the re-login dialog at someone who was never in a live session to begin with.
   *
   * The three outcomes are distinct on purpose — `unreachable` is a network failure, not an answer,
   * and must not be read as "the session is over".
   *
   * Two callers: `bootstrap`, for the browser-restart path, and the token lifecycle's wake resync,
   * for a session whose access token died while the tab was suspended.
   */
  async function recoverFromRefreshToken(): Promise<SessionRecoveryOutcome> {
    logger.debug("No access token but a refresh cookie is present; recovering the session");

    const result = await api.sendRefreshAccessTokenRequest();
    if (!result.success) {
      if (result.error === RefreshErrorResults.Unauthorized) {
        logger.log("Session recovery from the refresh token was rejected");
        return "rejected";
      }
      logger.warn("Could not reach the server to recover the session", result.error);
      return "unreachable";
    }

    store.applyExpiry(result.value.refreshAfter);
    return "recovered";
  }

  async function runBootstrap(
    hasToken: boolean,
    settleAnonymousOnFailure: boolean,
    canRecover: boolean,
  ): Promise<void> {
    // We can load the user if we already hold an access token, or if we can trade a leftover
    // refresh cookie for one (the browser-restart path — client-only).
    if (!hasToken) {
      if (!canRecover || !store.hasRefreshToken.value) {
        store.setAnonymous();
        return;
      }

      const recovery = await recoverFromRefreshToken();
      if (recovery === "unreachable") {
        // The same safety net the SSR path gets: the refresh cookie is still there and
        // the session may well be alive — we just could not ask. Leave the session
        // `unknown` and let the next bootstrap() try again, rather than painting a
        // logged-out shell over a session that never ended.
        allowBootstrapRetry();
        return;
      }
      if (recovery === "rejected") {
        store.setAnonymous();
        return;
      }
    }

    const result = await fetchMe(true);
    if (!result.success && settleAnonymousOnFailure) {
      // A present-but-rejected token (expired/invalid) resolves to logged-out.
      // On the server we instead leave the session `unknown` (see below) so the
      // client can retry a fetch that failed only because the backend was
      // unreachable during SSR — preserving the client-retry safety net.
      store.setAnonymous();
    }
  }

  /**
   * Resolves the initial session exactly once. On the server the caller passes
   * the incoming cookie's presence and `settleAnonymousOnFailure: false`, so a
   * transient SSR fetch failure leaves the session `unknown` and the client
   * bootstraps again. On the client it defaults to the store's cookie and does
   * settle. Single-flight so the plugin and any guard that races it share one
   * `me` round-trip (avoids a double-bootstrap between plugin + middleware).
   *
   * `canRecover` gates the refresh-token exchange. It is off during SSR: only the browser holds
   * the cookie jar the rotated token has to be written back into.
   */
  function bootstrap(opts?: {
    hasToken?: boolean
    settleAnonymousOnFailure?: boolean
    canRecover?: boolean
  }): Promise<void> {
    bootstrapPromise ??= runBootstrap(
      opts?.hasToken ?? store.hasAccessToken.value,
      opts?.settleAnonymousOnFailure ?? true,
      opts?.canRecover ?? canRecoverByDefault(),
    );
    return bootstrapPromise;
  }

  /**
   * Resolves once the session is no longer `unknown`. Route guards await this so
   * they never decide against an unsettled session (e.g. on a client-only route
   * whose bootstrap is still in flight).
   */
  function whenSettled(): Promise<void> {
    if (store.status.value !== "unknown") {
      return Promise.resolve();
    }
    return bootstrap();
  }

  return {
    isAuthorized: store.isAuthorized,
    user: store.user,
    status: store.status,
    fetchMe,
    refetchMe,
    authenticate,
    login,
    refreshAccessToken,
    recoverFromRefreshToken,
    logout,
    revokeSession,
    bootstrap,
    whenSettled,
  };
}
