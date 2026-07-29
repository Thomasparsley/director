import type { Client, CombinedError, Exchange, SubscriptionExchangeOpts } from "@urql/core";

import type { GqlVariablesDebounce } from "../config";
import type { GqlResponseError } from "../errors/responseError";
import type { GqlLogger } from "../utils/logger";

/**
 * How operations go on the wire.
 *
 * - `"document"` — the full query text, via urql's standard `fetchExchange`. Works
 *   against any GraphQL server; the default.
 * - `"persisted"` — `{ id, variables }` only, where `id` is the `documentId` that
 *   `gql.tada generate persisted` wrote into the document. Requires a server that
 *   resolves ids from the generated manifest, and a build step that produces it.
 */
export type GqlOperationsMode = "document" | "persisted";

/** The subscription transport urql hands operations to. */
export type GqlSubscriptionForwarder = SubscriptionExchangeOpts["forwardSubscription"];

/** Context handed to every factory the app configures, when the layer calls it. */
export interface GqlClientContext {
  /** The resolved HTTP endpoint. */
  url: string
  /** The wire format the layer's own exchanges were built for. */
  operations: GqlOperationsMode
  /** Whether this client is the SSR one. Subscriptions never run on the server. */
  isServer: boolean
  logger: GqlLogger
}

/**
 * A user-facing failure the layer wants surfaced. The layer has no opinion on *how* —
 * apps route it to a toast, a banner, an error tracker, or nowhere (the default).
 */
export interface GqlNotice {
  kind: "error"
  /** Short headline, e.g. the error's name or "Failed to execute mutation". */
  title: string
  /** The human-readable detail. */
  message: string
  /** The error behind the notice, for apps that want to inspect or report it. */
  error: CombinedError | GqlResponseError
}

/**
 * The layer's whole configuration surface, set from the consuming app. Type the entry
 * with `satisfies` — a layer cannot reliably augment `nuxt/schema` for a program that
 * compiles its raw source (the ADR-0001 trade):
 *
 * ```ts
 * // app/app.config.ts
 * export default defineAppConfig({
 *   gql: {
 *     url: () => useRuntimeConfig().public.gqlEndpoint,
 *   } satisfies GqlAppConfig,
 * });
 * ```
 *
 * Only `url` is required for the plugin to boot; everything else has defaults.
 */
export interface GqlAppConfig {
  /**
   * The HTTP endpoint. Required — the plugin refuses to boot without it. A function is
   * called lazily inside Nuxt context, so it may read `useRuntimeConfig()`.
   */
  url?: string | (() => string)

  /** The wire format. Defaults to `"document"`. */
  operations?: GqlOperationsMode

  /**
   * Whether queries go out as GET with the operation in the query string. Defaults to
   * `false` — every operation is a POST.
   *
   * urql's own default is `"within-url-limit"`, which silently turns queries into GETs;
   * that is a fine choice for a CDN-cacheable API and a broken one for the many servers
   * that only route POST. A layer cannot know which, so it asks rather than assumes.
   * `"force"` uses GET regardless of URL length.
   */
  preferGetMethod?: boolean | "force" | "within-url-limit"

  /**
   * Base fetch options merged into every request. Defaults to
   * `{ credentials: "include" }`. On the server the forwarded request headers
   * (see {@link ssrForwardHeaders}) are merged in on top of whatever this returns.
   */
  fetchOptions?: RequestInit | (() => RequestInit)

  /**
   * Headers copied from the incoming SSR request onto server-side requests.
   * Defaults to `["cookie"]`. Set `[]` to forward nothing.
   */
  ssrForwardHeaders?: readonly string[]

  /**
   * Installs the subscription exchange (client-side only) and gives it its transport.
   * Without this, subscriptions are not configured and `useSubscriptionAsync` has
   * nothing to run against.
   *
   * For the usual `graphql-ws` case, `makeGraphqlWsForwarder` builds one:
   *
   * ```ts
   * forwardSubscription: () => makeGraphqlWsForwarder({
   *   url: useRuntimeConfig().public.gqlWsEndpoint,
   * }),
   * ```
   *
   * It lives in its own module so that an app without subscriptions never imports —
   * and therefore never has to install — `graphql-ws`.
   */
  forwardSubscription?: (context: GqlClientContext) => GqlSubscriptionForwarder

  /**
   * Adjusts the exchange chain. Receives the layer's defaults, in order, and returns
   * the list to actually use — the seam for an auth exchange, a document cache, retries
   * or logging:
   *
   * ```ts
   * exchanges: defaults => [myAuthExchange, ...defaults],
   * ```
   *
   * Note the defaults deliberately contain no `cacheExchange`: `useQuery` owns its own
   * state and the layer has its own SSR payload cache, so a second document cache in
   * front of them mostly causes surprises. Add one here if you want urql's.
   */
  exchanges?: (defaults: Exchange[], context: GqlClientContext) => Exchange[]

  /**
   * Full escape hatch: build the urql `Client` yourself. Wins over `operations`,
   * `fetchOptions`, `forwardSubscription` and `exchanges` — the layer then only supplies
   * the composables on top.
   */
  client?: (context: GqlClientContext) => Client

  /**
   * Abort a request that has not answered within this many milliseconds.
   *
   * Off by default, deliberately: a layer cannot know which of an app's queries are
   * legitimately slow, and cutting a report off at an arbitrary deadline is worse than
   * waiting. Set it if you care about the SSR case, where an unresponsive endpoint holds
   * the render open until the server itself gives up.
   */
  requestTimeoutMs?: number

  /**
   * Whether a query's result is written into the SSR payload and read back during
   * hydration, so it is not fetched twice. Defaults to `true`.
   */
  ssrCache?: boolean

  /** Debounce for refetching on reactive `variables`. Defaults to 300ms / 500ms max. */
  variablesDebounce?: Partial<GqlVariablesDebounce>

  /**
   * Where user-facing errors go. Called by `handleMutationResult` and
   * `notifyOnGqlError`; silent by default.
   */
  notify?: (notice: GqlNotice) => void

  /** Logger factory (one logger per scope); the layer is silent without it. */
  logger?: (scope: string) => GqlLogger
}
