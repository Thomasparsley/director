import { getCurrentScope, onScopeDispose, unref } from "vue";
import { Kind, OperationTypeNode } from "graphql";
import type { DocumentDecoration } from "gql.tada";

import type { SubscriptionNode } from "../types/nodes";
import type { GraphqlSubscriptionObservable, SubscriptionOptions } from "../types/subscribe";

import { useGqlClient } from "./useGqlClient";

/**
 * Opens a subscription and hands back its observable. Requires `gql.forwardSubscription`
 * in app.config — without a transport the operation has nowhere to go.
 */
export function useSubscriptionAsync<Node extends DocumentDecoration>(
  subscription: Node,
  options: SubscriptionOptions<Node>,
): GraphqlSubscriptionObservable<Node>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
export function useSubscriptionAsync<Node extends DocumentDecoration<any, {}>>(
  subscription: Node,
  options?: SubscriptionOptions<Node>,
): GraphqlSubscriptionObservable<Node>;

export function useSubscriptionAsync<Node>(
  subscription: Node,
  options?: SubscriptionOptions<Node>,
): GraphqlSubscriptionObservable<Node> {
  // Get GraphQL client
  const client = useGqlClient();

  // Make variables
  const variables = (unref(options?.variables) || undefined);

  // A persisted document is stripped of its AST at build time — `definitions` is empty —
  // but urql reads the operation kind off the first definition to decide which exchange
  // handles it. Without a stand-in, a persisted subscription is routed as a query. The
  // node is synthetic on purpose: only its `operation` is ever read, since the server
  // resolves the real document from the id.
  const subscriptionOpt = {
    ...subscription,
    definitions: (subscription as SubscriptionNode<Node>).definitions.length > 0
      ? (subscription as SubscriptionNode<Node>).definitions
      : [
          {
            kind: Kind.OPERATION_DEFINITION,
            operation: OperationTypeNode.SUBSCRIPTION,
            selectionSet: {
              kind: Kind.SELECTION_SET,
              selections: [],
            },
          },
        ],
  };

  const observable = client.subscription(
    subscriptionOpt as never as SubscriptionNode<Node>,
    variables,
  ) as never as GraphqlSubscriptionObservable<Node>;

  // Leaving the scope that opened the subscription closes it — the same contract queries
  // get. Without this an unmounted component's subscription stays open, and the server
  // keeps its end alive too: this is a socket, so nothing collects it on its own.
  return {
    subscribe(onResult) {
      const subscription = observable.subscribe(onResult);

      if (getCurrentScope()) {
        onScopeDispose(() => subscription.unsubscribe());
      }

      return subscription;
    },
  };
}
