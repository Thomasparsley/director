import { useAppConfig, useNuxtApp } from "#app";

import {
  defaultGqlFetchOptions,
  defaultGqlSsrForwardHeaders,
  defaultGqlVariablesDebounce,
} from "../config";
import type { GqlVariablesDebounce } from "../config";
import type {
  GqlAppConfig,
  GqlClientContext,
  GqlNotice,
  GqlOperationsMode,
  GqlSubscriptionForwarder,
} from "../types/appConfig";
import { noopGqlLogger } from "../utils/logger";
import type { GqlLogger } from "../utils/logger";

import type { Client, Exchange } from "@urql/core";

export interface GqlRuntime {
  /** Whether the app configured `gql.url` — the plugin refuses to boot without it. */
  readonly hasUrl: boolean
  /** The resolved endpoint. Throws when unconfigured. */
  readonly url: string
  operations: GqlOperationsMode
  preferGetMethod: boolean | "force" | "within-url-limit"
  /** Abort a request that has not answered within this budget. 0 / undefined = no timeout. */
  requestTimeoutMs: number | undefined
  ssrCache: boolean
  variablesDebounce: GqlVariablesDebounce
  ssrForwardHeaders: readonly string[]
  /** The app's base fetch options, resolved fresh (the config may hand back a function). */
  fetchOptions: () => RequestInit
  /** One logger per scope; the noop logger unless the app configured one. */
  logger: (scope: string) => GqlLogger
  /** Routes a user-facing failure wherever the app wants it; noop by default. */
  notify: (notice: GqlNotice) => void
  /** The app's exchange adjustment, or identity. */
  exchanges: (defaults: Exchange[], context: GqlClientContext) => Exchange[]
  /** The app's subscription transport, if it configured one. */
  forwardSubscription: ((context: GqlClientContext) => GqlSubscriptionForwarder) | undefined
  /** The app's full client override, if it configured one. */
  client: ((context: GqlClientContext) => Client) | undefined
}

// Memoised on the (per-request) Nuxt app: the config never changes within an app, and
// every composable must see the same resolved values as the plugin that built the client.
const RUNTIME_MEMO_KEY = "$__gqlRuntime";

/**
 * Resolves the layer's configuration (`gql` in `app.config`) into the runtime the plugin
 * and every composable read: the endpoint, the wire format, merged defaults, and the
 * app-supplied hooks.
 */
export function useGqlRuntime(): GqlRuntime {
  const nuxtApp = useNuxtApp() as unknown as Record<string, unknown>;
  const existing = nuxtApp[RUNTIME_MEMO_KEY] as GqlRuntime | undefined;
  if (existing) {
    return existing;
  }

  const input = (useAppConfig() as { gql?: GqlAppConfig }).gql;

  const runtime: GqlRuntime = {
    operations: input?.operations ?? "document",
    preferGetMethod: input?.preferGetMethod ?? false,
    requestTimeoutMs: input?.requestTimeoutMs,
    ssrCache: input?.ssrCache ?? true,
    variablesDebounce: { ...defaultGqlVariablesDebounce, ...input?.variablesDebounce },
    ssrForwardHeaders: input?.ssrForwardHeaders ?? defaultGqlSsrForwardHeaders,
    logger: input?.logger ?? (() => noopGqlLogger),
    notify: input?.notify ?? (() => {}),
    exchanges: input?.exchanges ?? (defaults => defaults),
    forwardSubscription: input?.forwardSubscription,
    client: input?.client,

    fetchOptions: () => {
      const configured = input?.fetchOptions;
      if (!configured) {
        return { ...defaultGqlFetchOptions };
      }
      return typeof configured === "function" ? configured() : { ...configured };
    },

    get hasUrl() {
      return input?.url !== undefined;
    },
    get url() {
      const configured = input?.url;
      if (configured === undefined) {
        throw new Error(
          "[gql] No endpoint configured. Set `gql.url` in app.config so the gql layer "
          + "knows where to send operations (see GqlAppConfig).",
        );
      }
      return typeof configured === "function" ? configured() : configured;
    },
  };

  nuxtApp[RUNTIME_MEMO_KEY] = runtime;
  return runtime;
}
