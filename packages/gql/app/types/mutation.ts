import type { Ref } from "vue";
import type { ResultOf, VariablesOf } from "gql.tada";

import type { GqlError } from "./error";
import type { HasNodeVariables } from "./nodes";

export type MutationOptions<Node, Data> = {
  /**
   * A unique key for the mutation operation. If not provided, a default key will be generated.
   */
  key?: string

  onError?: (error: GqlError) => void

  transform?: (data: ResultOf<Node>) => Data
} & (
  HasNodeVariables<Node> extends true
    ? { variables: VariablesOf<Node> }
    : { variables?: never }
);

export interface MutationResponse<T> {
  /**
   * The mutation data, or `undefined` if the server returned none.
   */
  data: Ref<T | undefined>

  /**
   * The transport / GraphQL-execution error, or `undefined` if none occurred.
   */
  error: Ref<GqlError | undefined>

  pending: Ref<boolean>
}

/**
 * A mutation payload that carries its own `errors` list — the "expected failure"
 * channel most schemas model alongside the happy-path fields.
 */
export type MutationResult<T> = {
  errors: T extends { errors: infer Errors } ? Errors : never
} & T;
