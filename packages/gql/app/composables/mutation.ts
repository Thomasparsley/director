import { ref } from "vue";
import type { DocumentDecoration, ResultOf } from "gql.tada";

import type { MutationOptions, MutationResponse } from "../types/mutation";
import type { MutationNode } from "../types/nodes";
import { executeMutation } from "../utils/mutation";

/**
 * Runs a mutation and awaits it, returning the settled `data` / `error` / `pending` refs.
 * Pair it with `handleMutationResult` to turn a payload's own `errors` list into typed
 * per-code handling.
 */
export function useMutationAsync<Node extends DocumentDecoration, Data = ResultOf<Node>>(
  mutation: Node,
  options: MutationOptions<Node, Data>,
): Promise<MutationResponse<Data>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
export function useMutationAsync<Node extends DocumentDecoration<any, {}>, Data = ResultOf<Node>>(
  mutation: Node,
  options?: MutationOptions<Node, Data>,
): Promise<MutationResponse<Data>>;

export async function useMutationAsync<Node, Data = ResultOf<Node>>(
  mutation: Node,
  options?: MutationOptions<Node, Data>,
) {
  // Prepare response object.
  const asyncData: MutationResponse<Data> = {
    data: ref(undefined),
    error: ref(undefined),
    pending: ref(false),
  };

  // Prepare mutation and execute it.
  await executeMutation(mutation as MutationNode<Node>, asyncData, options);

  return asyncData;
}
