import { defineNuxtPlugin } from "#app";

import { useIdentityInstance } from "../composables/useIdentity";
import type { IdentityInstance } from "../composables/useIdentity";
import { useIdentityRuntime } from "../composables/useIdentityRuntime";
import { useSessionStore } from "../session/store";

/**
 * Boots the identity singleton and provides it as `$identityInstance`. Refuses to
 * boot (with a dev warning) until the app configures `identity.api` in app.config —
 * the layer cannot know how to talk to a backend it was never told about.
 */
export default defineNuxtPlugin({
  name: "identityInstance",
  enforce: "pre",
  parallel: true,
  setup: async () => {
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

      // Returning after a browser restart: the access token is gone, but the refresh cookie is
      // still here. Only the browser can make that exchange — a token rotated during SSR would
      // be written into the wrong cookie jar and lost. So leave the session `unknown` (NOT
      // `anonymous`, which would settle it and stop the client from trying) and let the client
      // branch below recover immediately after hydration.
      if (!hasToken && hasRefreshToken) {
        return { provide: { identityInstance } };
      }

      // Leave the session `unknown` (not `anonymous`) if a present token fails
      // to resolve during SSR — likely the backend was unreachable, so let the
      // client retry rather than rendering the user as logged out.
      await identityInstance.bootstrap({
        hasToken,
        settleAnonymousOnFailure: false,
        canRecover: false,
      });
    }
    else if (identityInstance.sessionStatus.value === "unknown") {
      // Client, but the payload never settled the session (a client-only route,
      // SSR couldn't reach the backend, or SSR handed us a refresh-cookie recovery).
      // Bootstrap WITHOUT blocking app boot — route guards await `whenSettled()`
      // when they actually need it.
      void identityInstance.bootstrap();
    }

    return {
      provide: {
        identityInstance,
      },
    };
  },
});
