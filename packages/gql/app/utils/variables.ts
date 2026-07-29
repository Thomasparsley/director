import { toValue } from "vue";
import type { Ref } from "vue";
import type { VariablesOf } from "gql.tada";

/**
 * Unwraps the caller's variables into a plain object.
 *
 * An empty object is a legitimate variables value, so only `undefined`/`null` collapse
 * to `undefined` — the callers treat that as "this operation takes no variables".
 */
export function getVariables<Node>(
  variables: VariablesOf<Node> | Ref<VariablesOf<Node>> | undefined,
): VariablesOf<Node> | undefined {
  if (variables) {
    const variablesValue = toValue(variables);
    if (variablesValue) {
      return variablesValue;
    }
  }
}
