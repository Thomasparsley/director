import { CombinedError, createRequest } from "@urql/core";
import type { ResultOf } from "gql.tada";

import { useGqlBaseFetchOptions, useGqlClient } from "../composables/useGqlClient";
import { useGqlRuntime } from "../composables/useGqlRuntime";
import type { MutationOptions, MutationResponse } from "../types/mutation";
import type { MutationNode } from "../types/nodes";

import { makeGraphqlDocumentOperationKey } from "./operationKey";
import { operationKindFor } from "./operationKind";
import { makeRequestSignal } from "./requestSignal";
import { getVariables } from "./variables";

/**
 * Runs one mutation into `asyncData`, resolving when it has settled.
 *
 * Like `executeQuery`, this resolves rather than rejects — every failure lands on
 * `asyncData.error`, and `handleMutationResult` is what turns it into a throw for callers
 * who want one.
 */
export async function executeMutation<Node, Data>(
  mutation: MutationNode<Node>,
  asyncData: MutationResponse<Data>,
  options?: MutationOptions<Node, Data>,
): Promise<void> {
  const runtime = useGqlRuntime();
  const logger = runtime.logger("Gql:Mutation");

  // Make variables
  const variables = getVariables(options?.variables);

  // Generate operation key
  const operationKey = makeGraphqlDocumentOperationKey(mutation, variables, options?.key);
  logger.debug("Preparing to execute mutation: ", operationKey, variables);

  // Get GraphQL client
  const client = useGqlClient();

  const fetchOptions = useGqlBaseFetchOptions();
  const signal = makeRequestSignal(undefined, runtime.requestTimeoutMs);

  // A new run supersedes the last one's outcome. `useMutationAsync` builds fresh refs each
  // call, but `executeMutation` is exported and may be handed reused state.
  asyncData.error.value = undefined;

  // Set pending state
  asyncData.pending.value = true;
  logger.debug("Executing mutation", operationKey);

  return new Promise((resolve) => {
    const opt = client.createRequestOperation(
      operationKindFor(mutation, "mutation"),
      createRequest(mutation, variables ?? {}),
      signal ? { fetchOptions: { ...fetchOptions, signal } } : { fetchOptions },
    );

    client.executeRequestOperation(opt)
      .toPromise()
      .then((response) => {
        if (response.error) {
          asyncData.error.value = response.error;
          if (options?.onError) {
            options.onError(response.error);
          }
        }
        else if (response.data === undefined) {
          logger.error("Mutation response contains no data: ", operationKey);
        }
        else {
          const responseData = response.data as ResultOf<Node>;

          if (responseData !== null && options?.transform) {
            asyncData.data.value = options.transform(responseData);
          }
          else {
            asyncData.data.value = responseData as Data | undefined;
          }

          logger.debug("Mutation executed successfully: ", operationKey);
        }
      })
      .catch((reason: unknown) => {
        logger.error("Executed mutation failed: ", operationKey, reason);

        // A rejection here never reached the `then` above, so nothing set `error`.
        // Without this the caller sees "no data and no error" and reports a generic
        // failure, losing the cause entirely (upstream bug).
        const error = reason instanceof CombinedError
          ? reason
          : new CombinedError({
              networkError: reason instanceof Error ? reason : new Error(String(reason)),
            });

        asyncData.error.value = error;
        if (options?.onError) {
          options.onError(error);
        }
      })
      .finally(() => {
        asyncData.pending.value = false;
        resolve();
      });
  });
}
