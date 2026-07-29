import type { SessionStatus } from "./types";

export interface AuthRecoveryDeps {
  getStatus: () => SessionStatus
  isAuthorized: () => boolean
  /** Attempt a token refresh (over the identity API — so it can't re-trigger auth errors). */
  refresh: () => Promise<void>
  /** Surface the re-login dialog and resolve when the user signs in or dismisses it. */
  promptRelogin: () => Promise<boolean>
}

/**
 * Recovers from a transport-level auth failure — the app's data layer reporting
 * "not authenticated" on an operation we believed was authenticated (a 401, a
 * GraphQL auth error, …). Wire `recoverAuth` into that transport's error hook.
 *
 * - Single-flight: concurrent failing operations share one recovery.
 * - Gated on `status === "authenticated"`, so anonymous users' auth errors and
 *   the bootstrap `me` fetch pass straight through (no dialog), and a dismissed
 *   dialog — which leaves the session `expired` — is not re-prompted.
 * - Tries a refresh first (fixes a transient race); only if that leaves us
 *   unauthorized do we prompt for re-login and await the outcome, so the
 *   transport can retry the failed operation once the session is restored.
 */
export function createAuthRecovery(deps: AuthRecoveryDeps) {
  let recovering: Promise<void> | null = null;

  function recoverAuth(): Promise<void> {
    if (recovering) {
      return recovering;
    }
    if (deps.getStatus() !== "authenticated") {
      return Promise.resolve();
    }
    recovering = (async () => {
      await deps.refresh();
      if (deps.isAuthorized()) {
        return;
      }
      await deps.promptRelogin();
    })().finally(() => {
      recovering = null;
    });
    return recovering;
  }

  return { recoverAuth };
}
