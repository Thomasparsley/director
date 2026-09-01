import { parseBooleanCookie } from "#layers/director-identity/app/core/cookieValue";
import { defaultIdentityCookieNames } from "#layers/director-identity/app/config";
import { LoginErrorResults, RefreshErrorResults } from "#layers/director-identity/app/errors/identityApiErrors";
import type { IdentityApi } from "#layers/director-identity/app/types/identityApi";

/**
 * An in-browser fake of an identity backend so the playground can demo the layer
 * without a server. It plays the server's part of the contract: on login it writes
 * the JS-readable marker cookies a real backend would set next to its httpOnly
 * tokens, and `fetchUser` answers from that cookie — so the session survives a
 * reload exactly like a real one. Sign in with `demo` / `demo`.
 */
const TOKEN_LIFETIME_MS = 30 * 60_000;

// A real backend answers over the network, so the client bootstrap can never settle
// the session in the middle of hydration. This mock would — it resolves in a
// microtask — and the repaint mid-hydration trips Vue's mismatch warning (which the
// E2E console guard rightly fails on). The latency keeps the mock honest, and makes
// the "authenticating" state visible in the demo as a bonus.
const SIMULATED_LATENCY_MS = 150;

function simulateLatency(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, SIMULATED_LATENCY_MS));
}

const demoUser = {
  name: "Demo User",
  email: "demo@example.com",
};

function refreshAfter(): string {
  return new Date(Date.now() + TOKEN_LIFETIME_MS).toISOString();
}

function readCookie(name: string): string | undefined {
  if (import.meta.server) {
    return undefined;
  }
  const match = document.cookie
    .split("; ")
    .find(entry => entry.startsWith(`${name}=`));
  return match?.slice(name.length + 1);
}

function hasSession(): boolean {
  return parseBooleanCookie(readCookie(defaultIdentityCookieNames.hasAccessToken));
}

function writeMarkerCookies(present: boolean): void {
  if (import.meta.server) {
    return;
  }
  const attributes = present ? "path=/" : "path=/; max-age=0";
  document.cookie = `${defaultIdentityCookieNames.hasAccessToken}=true; ${attributes}`;
  document.cookie = `${defaultIdentityCookieNames.hasRefreshToken}=true; ${attributes}`;
}

export function makeIdentityMockApi(): IdentityApi {
  return {
    sendLoginRequest: async (credentials) => {
      await simulateLatency();
      const identifier = "username" in credentials ? credentials.username : credentials.email;
      if (identifier !== "demo" || credentials.password !== "demo") {
        return { success: false, error: LoginErrorResults.InvalidCredentials };
      }
      writeMarkerCookies(true);
      return { success: true, value: { status: "OK", refreshAfter: refreshAfter() } };
    },

    sendRefreshAccessTokenRequest: async () => {
      await simulateLatency();
      if (!hasSession()) {
        return { success: false, error: RefreshErrorResults.Unauthorized };
      }
      writeMarkerCookies(true);
      return { success: true, value: { refreshAfter: refreshAfter() } };
    },

    sendLogoutRequest: async () => {
      writeMarkerCookies(false);
    },

    fetchUser: async () => {
      await simulateLatency();

      // This backend lives in the browser, so on the server it cannot answer at all —
      // and saying so matters. The layer reads `IsNotAuthorizedForUserData` as the API
      // *answering* "this identifies nobody", which settles the session anonymous even
      // during SSR; returning it here would server-render a sign-in form at every
      // signed-in visitor. `ServerUnavailable` is the honest code: nothing was learned,
      // the session stays `unknown`, and the client asks again after hydration.
      if (import.meta.server) {
        return { success: false, error: LoginErrorResults.ServerUnavailable };
      }

      if (!hasSession()) {
        return { success: false, error: LoginErrorResults.IsNotAuthorizedForUserData };
      }
      return { success: true, value: demoUser };
    },
  };
}
