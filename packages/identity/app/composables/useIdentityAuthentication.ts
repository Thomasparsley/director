import { useNuxtApp } from "#app";

import { createIdentitySession } from "../session/sessionService";
import { useSessionStore } from "../session/store";

import { useIdentityRuntime } from "./useIdentityRuntime";

export type { LoginOutcome } from "../session/sessionService";

export type IdentitySession = ReturnType<typeof createIdentitySession>;

// Memoised on the (per-request) Nuxt app. The service owns the bootstrap single-flight
// latch, so a second instance would carry its own — quietly reintroducing the duplicate
// `me` round-trip that latch exists to prevent. One service per app, shared by every
// composable that reaches for it.
const SESSION_MEMO_KEY = "$__identitySession";

/**
 * Production wiring for the identity state machine: hands the app-configured API
 * to `createIdentitySession`. The flows themselves live in the (dependency-injected,
 * unit-tested) service; what `fetchUser` actually speaks — REST, GraphQL, a mock —
 * is whatever the app put behind its `IdentityApi`.
 */
export function useIdentityAuthentication(): IdentitySession {
  const nuxtApp = useNuxtApp() as unknown as Record<string, unknown>;
  const existing = nuxtApp[SESSION_MEMO_KEY] as IdentitySession | undefined;
  if (existing) {
    return existing;
  }

  const runtime = useIdentityRuntime();
  const store = useSessionStore();

  const session = createIdentitySession({
    store,
    api: runtime.api,
    fetchUser: () => runtime.api.fetchUser(),
    logger: runtime.logger("Identity:Auth"),
    // Only the browser holds the cookie jar a rotated refresh token is written into.
    canRecoverByDefault: () => import.meta.client === true,
  });

  nuxtApp[SESSION_MEMO_KEY] = session;
  return session;
}
