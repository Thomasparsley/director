import { useGqlQueryPromiseCache } from "../composables/useGqlClient";
import { useGqlRuntime } from "../composables/useGqlRuntime";
import type { QueryDataPassthrough, QueryResponse } from "../types/query";

interface SharedQueryOptions {
  /** Identifies the shared operation. Concurrent callers with the same key share one request. */
  cacheKey: string
  /** Refetch even when `queryState.data` already holds a value. */
  forceFetch?: boolean
}

/**
 * Collapses concurrent callers of the same query onto one in-flight request.
 *
 * The case this exists for: several components mounting at once, each wanting the same
 * shared state (the current user, a lookup list). Without this they each fire their own
 * request; with it, the first one runs and the rest await it.
 *
 * Resolves to `undefined` when there was nothing to do (data already present) or when the
 * shared promise failed — the caller reads the outcome off `queryState`, which the
 * underlying query has already written.
 */
export async function executeSharedQuery<Node, Data>(
  queryState: QueryDataPassthrough<Data>,
  queryCallback: () => Promise<QueryResponse<Node, Data>>,
  options: SharedQueryOptions,
): Promise<QueryResponse<Node, Data> | undefined> {
  type Response = QueryResponse<Node, Data>;

  const queryPromiseCache = useGqlQueryPromiseCache();
  const logger = useGqlRuntime().logger("Gql:SharedQuery");

  const { cacheKey, forceFetch = false } = options;

  // Only the caller that put a promise in the cache may take it out again. Evicting on
  // every path would let a caller that did nothing — because the data was already there —
  // drop somebody else's in-flight request, and the next caller would refetch it.
  let owns = false;

  try {
    // If already pending, wait for the existing promise
    if (queryState.pending.value) {
      const existingPromise = queryPromiseCache.get(cacheKey);
      if (existingPromise) {
        try {
          return await existingPromise as Response;
        }
        catch {
          // The owning caller already handled this; the error is on `queryState`.
          return undefined;
        }
      }
    }

    // If data already exists and not force-fetched, return immediately
    if (!forceFetch && queryState.data.value !== undefined) {
      return;
    }

    const cachedPromise = queryPromiseCache.get(cacheKey);
    if (cachedPromise) {
      try {
        return await cachedPromise as Response;
      }
      catch {
        // The owning caller already handled this; the error is on `queryState`.
        return undefined;
      }
    }

    // Create new promise and cache it
    const operationPromise = queryCallback();
    queryPromiseCache.set(cacheKey, operationPromise);
    owns = true;

    try {
      return await operationPromise as Response;
    }
    catch (error) {
      logger.error("Shared query failed: ", cacheKey, error);
      return undefined;
    }
  }
  finally {
    if (owns) {
      queryPromiseCache.delete(cacheKey);
    }
  }
}
