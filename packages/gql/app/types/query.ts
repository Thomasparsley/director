import type { Ref } from "vue";
import type { ResultOf, VariablesOf } from "gql.tada";

import type { GqlError } from "./error";
import type { HasNodeVariables } from "./nodes";

export interface QueryDataPassthrough<Data> {
  pending: Ref<boolean>

  /**
   * The query data or `undefined` if an error occurred.
   */
  data: Ref<Data | undefined>

  /**
   * The error that occurred during the query execution, or `undefined` if no error occurred
   */
  error: Ref<GqlError | undefined>
}

/** The same three fields, unwrapped — for holding query state inside a store. */
export interface QueryStoreData<Data> {
  data: Data | undefined
  error: GqlError | undefined
  pending: boolean
}

/**
 * Options for configuring a GraphQL query.
 *
 * @template Node - The type of the GraphQL query node.
 * @template Data - The transformed data type (defaults to the result of Node).
 */
export type QueryOptions<Node, Data> = {
  /**
   * A unique key for the query operation. If not provided, a default key will be generated.
   */
  key?: string

  /**
   * An AbortController to cancel the query execution.
   * When the signal is aborted, the in-flight request will be cancelled.
   * If not provided, an internal AbortController is created automatically.
   */
  signal?: AbortSignal

  /**
   * Whether to resolve the query promise immediately without waiting for the query to complete.
   * If `true`, the promise resolves instantly and the query executes in the background.
   * Defaults to `false`.
   */
  lazy?: boolean

  /**
   * Callback function invoked when the query encounters an error.
   */
  onError?: (error: GqlError) => void

  /**
   * Transform function to convert the raw query result into a custom data structure.
   */
  transform?: (data: ResultOf<Node>) => Data

  /**
   * Whether to skip the SSR payload cache — both writing it on the server and reading it
   * during hydration. Defaults to `false`.
   */
  skipSsrCache?: boolean
} & (
  HasNodeVariables<Node> extends true ? {
    /**
     * Whether to execute the query immediately upon initialization.
     * If `false`, the query will only execute when explicitly triggered (e.g., via `refresh`).
     * Defaults to `true`.
     */
    immediate?: boolean
  } & (
    | { immediate?: true, variables: VariablesOf<Node> | Ref<VariablesOf<Node>> }
    | { immediate: false, variables?: VariablesOf<Node> | Ref<VariablesOf<Node>> }
    )
    : {
      immediate?: boolean
      variables?: never
    }
);

/**
 * Query response containing the query data, error, and refresh function.
 *
 * @template Node - The type of the GraphQL query node.
 */
export interface QueryResponse<Node, Data> extends QueryDataPassthrough<Data> {

  /**
   * Refreshes the query with the provided options.
   *
   * @param refOpts - The options for refreshing the query.
   * @returns A promise that resolves when the query has been refreshed.
   */
  refresh: (refOpts?: Partial<QueryRefreshOptions<Node, Data>>) => Promise<void>
}

export type QueryRefreshOptions<Node, Data> = Pick<
  QueryOptions<Node, Data>,
  "variables"
>;
