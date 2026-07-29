// Adapted from urql's own subscriptionExchange:
// https://github.com/urql-graphql/urql/blob/main/packages/core/src/exchanges/subscription.ts
//
// The only change is what gets handed to `forwardSubscription`: `makePersistedFetchBody`
// produces `{ id, variables }` instead of `{ query, variables }`. Everything else is
// upstream's, kept in step so a urql upgrade is a diff against a known original.

import type { Subscription, Source } from "wonka";
import { filter, make, merge, mergeMap, pipe, takeUntil } from "wonka";
import {
  makeErrorResult,
  makeOperation,
  makeResult,
  mergeResultPatch,
  type Exchange,
  type ExecutionResult,
  type Operation,
  type OperationResult,
  type SubscriptionExchangeOpts,
} from "@urql/core";

import { makePersistedFetchBody } from "./makePersistedFetchBody";

export const persistedSubscriptionExchange
  = ({
    forwardSubscription,
    enableAllOperations,
    isSubscriptionOperation,
  }: SubscriptionExchangeOpts): Exchange =>
    ({ client, forward }) => {
      const createSubscriptionSource = (
        operation: Operation,
      ): Source<OperationResult> => {
        const observableish = forwardSubscription(
          makePersistedFetchBody(operation),
          operation,
        );

        return make<OperationResult>((observer) => {
          let isComplete = false;
          // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
          let sub: Subscription | void;
          // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
          let result: OperationResult | void;

          function nextResult(value: ExecutionResult) {
            observer.next(
              (result = result
                ? mergeResultPatch(result, value)
                : makeResult(operation, value)),
            );
          }

          Promise.resolve().then(() => {
            if (isComplete) return;

            sub = observableish.subscribe({
              next: nextResult,
              error(error) {
                if (Array.isArray(error)) {
                  // NOTE: This is an exception for transports that deliver `GraphQLError[]`, as part
                  // of the observer's error callback (may happen as part of `graphql-ws`).
                  // We only check for arrays here, as this is an extremely "unexpected" case as the
                  // shape of `ExecutionResult` is instead strictly defined.
                  nextResult({ errors: error });
                }
                else {
                  observer.next(makeErrorResult(operation, error));
                }
                observer.complete();
              },
              complete() {
                if (!isComplete) {
                  isComplete = true;
                  if (operation.kind === "subscription") {
                    client.reexecuteOperation(
                      makeOperation("teardown", operation, operation.context),
                    );
                  }
                  if (result && result.hasNext) {
                    nextResult({ hasNext: false });
                  }
                  observer.complete();
                }
              },
            });
          });

          return () => {
            isComplete = true;
            if (sub) sub.unsubscribe();
          };
        });
      };

      const isSubscriptionOperationFn
        = isSubscriptionOperation
          || (operation =>
            operation.kind === "subscription"
            || (!!enableAllOperations
              && (operation.kind === "query" || operation.kind === "mutation")));

      return (ops$) => {
        const subscriptionResults$ = pipe(
          ops$,
          filter(
            operation =>
              operation.kind !== "teardown"
              && isSubscriptionOperationFn(operation),
          ),
          mergeMap((operation) => {
            const { key } = operation;
            const teardown$ = pipe(
              ops$,
              filter(op => op.kind === "teardown" && op.key === key),
            );

            return pipe(
              createSubscriptionSource(operation),
              takeUntil(teardown$),
            );
          }),
        );

        const forward$ = pipe(
          ops$,
          filter(
            operation =>
              operation.kind === "teardown"
              || !isSubscriptionOperationFn(operation),
          ),
          forward,
        );

        return merge([subscriptionResults$, forward$]);
      };
    };
