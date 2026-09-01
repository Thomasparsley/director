import { defineNuxtPlugin } from "#app";

import { useIdentityInstance } from "../composables/useIdentity";
import type { IdentityInstance } from "../composables/useIdentity";
import { useIdentityRuntime } from "../composables/useIdentityRuntime";
import { planSsrSession, SessionBootstrapPlans } from "../session/bootstrapPlan";
import { useSessionStore } from "../session/store";
import { SessionStatuses } from "../session/types";

/**
 * Boots the identity singleton and provides it as `$identityInstance`. Refuses to
 * boot (with a dev warning) until the app configures `identity.api` in app.config —
 * the layer cannot know how to talk to a backend it was never told about.
 */
export default defineNuxtPlugin({
  name: "identityInstance",
  enforce: "pre",
  parallel: true,
  setup: async (nuxtApp) => {
    const runtime = useIdentityRuntime();
    if (!runtime.hasApi) {
      if (import.meta.dev) {
        console.warn(
          "[identity] The @directorkit/identity layer is extended but `identity.api` is "
          + "not set in app.config — the identity plugin will not boot.",
        );
      }
      // Provide `undefined` (rather than nothing) so every return site shares one
      // shape; useIdentity() turns the missing instance into a descriptive error.
      return { provide: { identityInstance: undefined as IdentityInstance | undefined } };
    }

    const identityInstance: IdentityInstance | undefined = useIdentityInstance();

    if (import.meta.server) {
      // SSR: resolve the session from the incoming cookies so the first paint and
      // the hydration payload already reflect the real login state. Blocking is
      // correct here — the server must settle before it renders. The store's shared
      // cookie refs read the incoming request's cookie header.
      const store = useSessionStore();
      const hasToken = store.hasAccessToken.value;
      const hasRefreshToken = store.hasRefreshToken.value;

      // The cookies-to-branch decision is a pure function, so it can be read as a table and
      // tested as one — see `session/bootstrapPlan.ts` and its spec. `DeferToClient` is the
      // returning visitor whose access token has died under a still-live refresh cookie: the
      // exchange rotates the token, and only the browser owns the cookie jar the successor has
      // to land in. The session stays `unknown` (NOT `anonymous`, which would settle it and stop
      // the client from trying) and the client branch below recovers right after hydration.
      const { plan } = planSsrSession({ hasAccessToken: hasToken, hasRefreshToken });
      if (plan === SessionBootstrapPlans.DeferToClient) {
        return { provide: { identityInstance } };
      }

      // `settleAnonymousOnFailure: false` covers exactly one failure: the "me" call got no
      // answer at all (the backend was unreachable from SSR). That leaves the session `unknown`
      // so the client can ask again, rather than rendering a logged-out header off a question
      // nobody managed to put. A token the API *rejected* is not that case — it settles
      // `anonymous` inside the state machine regardless of this flag, because it is an answer.
      await identityInstance.session.bootstrap({
        hasToken,
        settleAnonymousOnFailure: false,
        canRecover: false,
      });
    }
    else if (identityInstance.session.status.value === SessionStatuses.Unknown) {
      // Client, but the payload never settled the session (a client-only route,
      // SSR couldn't reach the backend, or SSR handed us a refresh-cookie recovery).
      // Bootstrap WITHOUT blocking app boot — route guards await `whenSettled()`
      // when they actually need it.
      //
      // After the first client render, though, not before it. This bootstrap can settle
      // in a microtask on a warm connection, and a session that flips *while* Vue is
      // hydrating makes the client's first render disagree with the markup the server
      // sent — Vue resolves that by throwing away the chrome it was handed and
      // rebuilding it, which is precisely the flicker `viewer.isSessionSettled` exists
      // to prevent. The hook costs the milliseconds between plugin setup and a resolved
      // root Suspense; anything that needs the answer sooner calls `whenSettled()`,
      // which starts the same single-flight bootstrap on demand.
      nuxtApp.hooks.hookOnce("app:suspense:resolve", () => {
        void identityInstance.session.bootstrap();
      });
    }

    return {
      provide: {
        identityInstance,
      },
    };
  },
});
