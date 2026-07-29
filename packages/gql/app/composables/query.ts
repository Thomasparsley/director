import { getCurrentScope, isRef, onScopeDispose } from "vue";
import { watchDebounced } from "@vueuse/core";
import type { DocumentDecoration, ResultOf } from "gql.tada";

import type { QueryNode } from "../types/nodes";
import type {
  QueryDataPassthrough,
  QueryOptions,
  QueryRefreshOptions,
  QueryResponse,
} from "../types/query";

import { executeQuery, makeQueryDataPassthrough } from "../utils/query";

import { useGqlRuntime } from "./useGqlRuntime";

/**
 * Prepares a query without running it. Returns the state refs plus `refresh()`, which is
 * what actually fetches — for a query whose variables are not known at setup time.
 */
export function useQuery<Node extends DocumentDecoration, Data = ResultOf<Node>>(
  query: Node,
  options: Omit<QueryOptions<Node, Data>, "immediate" | "variables">,
  passthrough?: QueryDataPassthrough<Data>,
): QueryResponse<Node, Data>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
export function useQuery<Node extends DocumentDecoration<any, {}>, Data = ResultOf<Node>>(
  query: Node,
  options?: Omit<QueryOptions<Node, Data>, "immediate" | "variables">,
  passthrough?: QueryDataPassthrough<Data>,
): QueryResponse<Node, Data>;

export function useQuery<Node, Data = ResultOf<Node>>(
  query: Node,
  options?: Omit<QueryOptions<Node, Data>, "immediate" | "variables">,
  passthrough?: QueryDataPassthrough<Data>,
): QueryResponse<Node, Data> {
  return useQueryImpl(
    query,
    {
      ...options,
      immediate: false,
      variables: undefined,
    } as QueryOptions<Node, Data>,
    passthrough,
    false,
  ) as QueryResponse<Node, Data>;
}

/**
 * Runs a query and awaits it. In a component's `setup` this blocks the render — and on
 * the server it is what puts the result into the SSR payload, so the client hydrates
 * without fetching again.
 */
export async function useQueryAsync<Node extends DocumentDecoration, Data = ResultOf<Node>>(
  query: Node,
  options: QueryOptions<Node, Data>,
  passthrough?: QueryDataPassthrough<Data>,
): Promise<QueryResponse<Node, Data>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
export async function useQueryAsync<Node extends DocumentDecoration<any, {}>, Data = ResultOf<Node>>(
  query: Node,
  options?: QueryOptions<Node, Data>,
  passthrough?: QueryDataPassthrough<Data>,
): Promise<QueryResponse<Node, Data>>;

export async function useQueryAsync<Node, Data = ResultOf<Node>>(
  query: Node,
  options?: QueryOptions<Node, Data>,
  passthrough?: QueryDataPassthrough<Data>,
): Promise<QueryResponse<Node, Data>> {
  return useQueryImpl(query, options, passthrough, true) as Promise<QueryResponse<Node, Data>>;
}

function useQueryImpl<Node, Data>(
  query: Node,
  options: QueryOptions<Node, Data> | undefined,
  passthrough: QueryDataPassthrough<Data> | undefined,
  shouldExecute: boolean,
): QueryResponse<Node, Data> | Promise<QueryResponse<Node, Data>> {
  const runtime = useGqlRuntime();

  // Track the current AbortController so we can cancel in-flight requests
  let currentAbortController: AbortController | undefined;

  passthrough ??= makeQueryDataPassthrough<Data>();

  const asyncData: QueryResponse<Node, Data> = {
    ...passthrough,
    async refresh(refOpts: Partial<QueryRefreshOptions<Node, Data>> = {}) {
      // Abort any in-flight request before starting a new one
      currentAbortController?.abort();
      currentAbortController = new AbortController();

      const opts = {
        ...options,
        immediate: true,
        ...refOpts,
        // The fresh signal has to travel WITH the request, or aborting the controller
        // above cancels nothing and each refresh races the last (upstream bug).
        signal: currentAbortController.signal,
        lazy: false,
      } as QueryOptions<Node, Data>;

      await executeQuery(query as QueryNode<Node>, asyncData, opts);
    },
  };

  if (import.meta.client && options?.variables && isRef(options.variables)) {
    watchDebounced(
      options.variables,
      vars => asyncData.refresh({ variables: vars }),
      runtime.variablesDebounce,
    );
  }

  // Leaving the scope that started the query cancels it: an unmounted component's
  // response has nowhere to land, and holding the request open only delays the next one.
  if (getCurrentScope()) {
    onScopeDispose(() => currentAbortController?.abort());
  }

  if (shouldExecute && options?.immediate !== false) {
    currentAbortController = new AbortController();

    const executeOptions = {
      ...options,
      signal: options?.signal ?? currentAbortController.signal,
    } as QueryOptions<Node, Data>;

    return executeQuery(query as QueryNode<Node>, asyncData, executeOptions).then(() => asyncData);
  }

  return asyncData;
}
