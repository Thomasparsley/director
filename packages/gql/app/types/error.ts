import type { CombinedError } from "@urql/core";

/**
 * The error shape every operation surfaces: urql's `CombinedError`, which folds a
 * network failure and a GraphQL `errors` array into one object.
 *
 * Payload-level errors (a mutation result's own `errors` list) are NOT this — they
 * arrive as data and become a `GqlResponseError` in `handleMutationResult`.
 */
export type GqlError = CombinedError;
