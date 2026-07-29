import { useGqlRuntime } from "../composables/useGqlRuntime";
import type { GqlError } from "../types/error";

/**
 * Ready-made `onError` for a query — routes the failure to `gql.notify`:
 *
 * ```ts
 * const { data } = await useQueryAsync(myQuery, { onError: notifyOnGqlError });
 * ```
 *
 * Silent unless the app configured `gql.notify`.
 */
export function notifyOnGqlError(error: GqlError): void {
  const { notify } = useGqlRuntime();

  notify({
    kind: "error",
    title: error.name,
    message: error.message,
    error,
  });
}
