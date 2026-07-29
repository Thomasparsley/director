import { ref } from "vue";
import type { Ref } from "vue";
import { createRequest } from "@urql/core";
import type { ResultOf } from "gql.tada";
import { onEnd, pipe, subscribe, take } from "wonka";

import { useNuxtApp } from "#app";

import { useGqlBaseFetchOptions, useGqlClient } from "../composables/useGqlClient";
import { useGqlRuntime } from "../composables/useGqlRuntime";
import type { GqlError } from "../types/error";
import type { QueryNode } from "../types/nodes";
import type {
  QueryDataPassthrough,
  QueryOptions,
  QueryResponse,
  QueryStoreData,
} from "../types/query";

import { makeGraphqlDocumentOperationKey } from "./operationKey";
import { operationKindFor } from "./operationKind";
import { makeRequestSignal } from "./requestSignal";
import { getVariables } from "./variables";

/**
 * The three refs a query writes into. Made separately so a caller can own the state —
 * a store that survives the component, say — and hand it to `useQuery` to fill.
 */
export function makeQueryDataPassthrough<Data>(
  defaultData: Data | undefined = undefined,
): QueryDataPassthrough<Data> {
  const data = ref(defaultData) as Ref<Data | undefined>;
  const error = ref<GqlError | undefined>(undefined);
  const pending = ref(false);

  return {
    data,
    error,
    pending,
  };
}

/** The same three fields unwrapped, for holding query state inside a reactive store. */
export function makeQueryStoreData<Data>(): QueryStoreData<Data> {
  return {
    data: undefined,
    error: undefined,
    pending: false,
  };
}

/**
 * Runs one query into `asyncData`, resolving when it has settled.
 *
 * The promise resolves rather than rejects: failures land on `asyncData.error` (and on
 * `options.onError`), because a query's caller is usually a template that renders the
 * error, not a `try`/`catch`.
 */
export function executeQuery<Node, Data>(
  query: QueryNode<Node>,
  asyncData: QueryResponse<Node, Data>,
  options?: QueryOptions<Node, Data>,
): Promise<void> {
  const nuxtApp = useNuxtApp();
  const runtime = useGqlRuntime();
  const logger = runtime.logger("Gql:Query");

  // Make variables
  const variables = getVariables(options?.variables);

  // Generate an operation key
  const operationKey = makeGraphqlDocumentOperationKey(query, variables, options?.key);
  logger.debug("Preparing to execute query: ", operationKey, variables);

  const ssrCache = runtime.ssrCache && !options?.skipSsrCache;

  // Try to get cached response from payload. The payload holds the RAW response, so a
  // transform is applied on the way out — two call sites sharing a document but shaping it
  // differently would otherwise collide on this key and the second would get the first's
  // shape.
  if (ssrCache && (import.meta.server || nuxtApp.isHydrating)) {
    const payload = nuxtApp.payload.data[operationKey];
    if (payload !== undefined) {
      logger.debug("Hydrating query data: ", operationKey);
      asyncData.data.value = payload !== null && options?.transform
        ? options.transform(payload as ResultOf<Node>)
        : (payload as Data);
      // A hydrated result supersedes whatever failed last.
      asyncData.error.value = undefined;
      return Promise.resolve();
    }
  }

  // Get GraphQL client
  const client = useGqlClient();

  if (options?.signal?.aborted) {
    logger.debug("Query already aborted before execution: ", operationKey);
    return Promise.resolve();
  }

  // A new run supersedes the last one's outcome: without this a `refresh()` that succeeds
  // leaves the previous error sitting next to fresh data, and a template watching `error`
  // never recovers.
  asyncData.error.value = undefined;

  // Set pending state
  asyncData.pending.value = true;
  logger.debug("Executing query: ", operationKey);

  return new Promise((resolve) => {
    if (options?.immediate === false) {
      resolve();
      asyncData.pending.value = false;
      return;
    }

    // `lazy` resolves the caller immediately and lets the request land later. Never on
    // the server, where resolving early would render before the data exists.
    const lazy = !import.meta.server && (options?.lazy ?? false);

    const fetchOptions = useGqlBaseFetchOptions();
    const signal = makeRequestSignal(options?.signal, runtime.requestTimeoutMs);

    const opt = client.createRequestOperation(
      operationKindFor(query, "query"),
      createRequest(query, variables ?? {}),
      signal
        ? { fetchOptions: { ...fetchOptions, signal } }
        : { fetchOptions },
    );

    let resolved = false;
    const tryResolve = () => {
      if (!resolved && !lazy) {
        resolved = true;
        resolve();
      }
    };

    const abortHandler = signal
      ? () => {
          unsubscribe();
          asyncData.pending.value = false;
          logger.debug(`Query aborted via signal for ${operationKey}`);
          tryResolve();
        }
      : undefined;

    const { unsubscribe } = pipe(
      client.executeRequestOperation(opt),
      // urql keeps a QUERY's result source open indefinitely so a cache can push updates
      // into it; it only self-terminates for other kinds. This layer executes one query
      // per call — `refresh()` is how a caller asks for another — so the source is closed
      // after the first result, which also dispatches urql's teardown.
      //
      // (Upstream got termination by mislabelling every operation's kind as `undefined`,
      // which had the side effect of taking urql's terminating branch. That also skipped
      // urql's kind assertion, and only worked at all because every document there was
      // persisted — see `operationKindFor`.)
      take(1),
      onEnd(() => {
        if (abortHandler) {
          signal!.removeEventListener("abort", abortHandler);
        }
        asyncData.pending.value = false;
        logger.debug(`Query pending completed for ${operationKey}`);
        tryResolve();
      }),
      subscribe((response) => {
        // If aborted, discard the response
        if (signal?.aborted) {
          logger.debug("Query aborted, discarding response: ", operationKey);
          return;
        }

        if (response.error) {
          // Network-level errors (e.g. failed fetch) are also surfaced here
          // by urql as a CombinedError with a networkError property.
          if (response.error.networkError) {
            logger.error("Executed query failed: ", operationKey, response.error.networkError);
          }

          asyncData.error.value = response.error;
          if (options?.onError) {
            options.onError(response.error);
          }
        }
        else if (response.data === undefined) {
          logger.error("Query response contains no data: ", operationKey);
        }
        else {
          const responseData = response.data as ResultOf<Node>;

          if (responseData !== null && options?.transform) {
            asyncData.data.value = options.transform(responseData);
          }
          else {
            asyncData.data.value = responseData as Data | undefined;
          }

          // The RAW response, not `asyncData.data.value` — see the hydration branch.
          if (ssrCache && import.meta.server) {
            nuxtApp.payload.data[operationKey] = responseData;
          }

          logger.debug("Query executed successfully: ", operationKey);
        }
      }),
    );

    // When the signal aborts, unsubscribe from the Wonka source.
    // This triggers urql's teardown mechanism, which cancels the fetch.
    if (abortHandler) {
      signal!.addEventListener("abort", abortHandler, { once: true });
    }

    if (lazy) {
      resolved = true;
      resolve();
    }
  });
}
