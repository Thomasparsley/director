// Adapted from urql's own fetchExchange:
// https://github.com/urql-graphql/urql/blob/main/packages/core/src/exchanges/fetch.ts
//
// The only change is the body: `makePersistedFetchBody` sends `{ id, variables }` instead
// of `{ query, variables }`. Everything else — the teardown handling, the debug events —
// is upstream's, kept in step so a urql upgrade is a diff against a known original.

import type { Exchange } from "@urql/core";
import { makeFetchOptions, makeFetchSource, makeFetchURL } from "@urql/core/internal";
import { filter, merge, mergeMap, onPush, pipe, takeUntil } from "wonka";

import { makePersistedFetchBody } from "./makePersistedFetchBody";

export const persistedFetchExchange: Exchange = ({ forward, dispatchDebug }) => {
  return (ops$) => {
    const fetchResults$ = pipe(
      ops$,
      filter((operation) => {
        return (
          operation.kind !== "teardown"
          && (operation.kind !== "subscription"
            || !!operation.context.fetchSubscriptions)
        );
      }),
      mergeMap((operation) => {
        const body = makePersistedFetchBody(operation);
        const url = makeFetchURL(operation, body);
        const fetchOptions = makeFetchOptions(operation, body);

        dispatchDebug({
          type: "fetchRequest",
          message: "A fetch request is being executed.",
          operation,
          data: {
            url,
            fetchOptions,
          },
        });

        const source = pipe(
          makeFetchSource(operation, url, fetchOptions),
          takeUntil(
            pipe(
              ops$,
              filter(op => op.kind === "teardown" && op.key === operation.key),
            ),
          ),
        );

        if (import.meta.dev) {
          return pipe(
            source,
            onPush((result) => {
              const error = !result.data ? result.error : undefined;

              dispatchDebug({
                type: error ? "fetchError" : "fetchSuccess",
                message: `A ${
                  error ? "failed" : "successful"
                } fetch response has been returned.`,
                operation,
                data: {
                  url,
                  fetchOptions,
                  value: error || result,
                },
              });
            }),
          );
        }

        return source;
      }),
    );

    const forward$ = pipe(
      ops$,
      filter((operation) => {
        return (
          operation.kind === "teardown"
          || (operation.kind === "subscription"
            && !operation.context.fetchSubscriptions)
        );
      }),
      forward,
    );

    return merge([fetchResults$, forward$]);
  };
};
