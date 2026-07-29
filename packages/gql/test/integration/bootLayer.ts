import { url } from "@nuxt/test-utils/e2e";

import plugin from "#layers/director-gql/app/plugins/gql";
import type { GqlAppConfig } from "#layers/director-gql/app/types/appConfig";

import {
  provideToNuxtApp,
  resetNuxtAppStub,
  setRenderSide,
  setRequestHeaders,
} from "../nuxtApp";

interface BootOptions {
  /** Which side the layer believes it is on. Defaults to `"client"`. */
  side?: "client" | "server"
  /** Headers on the incoming SSR request, for the forwarding path. */
  requestHeaders?: Record<string, string>
}

/**
 * Boots the layer for real against the running fixture: the actual plugin builds the
 * actual urql client, and its provides are placed on the `#app` stub exactly as Nuxt
 * would.
 *
 * This is what makes the tier *integration* rather than unit — nothing is faked between
 * the composables and the socket except the Nuxt app object itself, which only exists to
 * hold the provides.
 */
export function bootGqlLayer(config: Partial<GqlAppConfig> = {}, options: BootOptions = {}) {
  resetNuxtAppStub({
    gql: {
      url: url("/api/graphql"),
      ...config,
    } satisfies GqlAppConfig,
  });

  // After the reset, which clears both.
  setRenderSide(options.side ?? "client");
  if (options.requestHeaders) {
    setRequestHeaders(options.requestHeaders);
  }

  const setup = (plugin as unknown as {
    setup: () => { provide: Record<string, unknown> }
  }).setup;

  const { provide } = setup();

  provideToNuxtApp({
    $gqlClient: provide.gqlClient,
    $gqlBaseFetchOptions: provide.gqlBaseFetchOptions,
    $gqlQueryPromiseCache: provide.gqlQueryPromiseCache,
  });

  return provide;
}
