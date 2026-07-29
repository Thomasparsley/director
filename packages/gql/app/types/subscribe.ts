import type { ResultOf, VariablesOf } from "gql.tada";

import type { HasNodeVariables } from "./nodes";

export type SubscriptionOptions<Node> = {

} & (
  HasNodeVariables<Node> extends true
    ? { variables: VariablesOf<Node> }
    : { variables?: never }
);

export interface Subscription {
  unsubscribe: () => void
}

export interface GraphqlSubscriptionObservable<Node> {
  subscribe: (onResult: (value: { data: ResultOf<Node> }) => void) => Subscription
}
