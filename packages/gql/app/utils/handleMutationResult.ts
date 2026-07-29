import { unref } from "vue";
import { CombinedError } from "@urql/core";

import type { NonNullableFields } from "#layers/director-common/app/types/nonNullable";

import { useGqlRuntime } from "../composables/useGqlRuntime";
import { GqlResponseError } from "../errors/responseError";
import type { MutationResponse, MutationResult } from "../types/mutation";

/**
 * Turns a payload's `errors` list into one handler per error code: a schema whose errors
 * are `{ code: "EmailTaken" | "RateLimited", message }` yields `onEmailTaken` /
 * `onRateLimited`. A handler returning `false` says it did NOT handle the error; anything
 * else (including no return at all) counts as handled.
 */
type ErrorHandlerMap<T> = T extends Array<infer E> ? E extends { code: infer C }
  ? C extends string
    ? { [K in `on${C}`]: (err: E) => boolean | void }
    : never
  : never : never;

interface IError {
  code: string
  message: string
}

export interface HandleMutationResult<T, Result extends MutationResult<T> = MutationResult<T>> {
  response: MutationResponse<T>
  onError?: ErrorHandlerMap<Result["errors"]>
}

/**
 * Unwraps a settled mutation into its success payload, or throws.
 *
 * Three failure shapes, three outcomes:
 *
 * - a transport / GraphQL-execution error (`response.error`) is announced through
 *   `gql.notify` and rethrown as-is;
 * - a payload-level `errors` list is dispatched to the matching `on<Code>` handlers and
 *   then thrown as a {@link GqlResponseError}, whose `handled` flag says whether every
 *   error found a handler — so a caller can unwind without reporting it twice;
 * - a missing payload throws a plain error.
 *
 * On success the return type drops the `errors` field and marks the rest non-nullable:
 * the error branch is gone, so the caller should not have to re-narrow every field.
 */
export function handleMutationResult<
  T,
  Result extends MutationResult<T>,
>(
  { response, onError }: HandleMutationResult<T, Result>,
) {
  const { notify } = useGqlRuntime();
  const { data, error } = response;

  if (error.value) {
    const err = error.value;

    if (err instanceof CombinedError) {
      if (err.graphQLErrors.length > 0) {
        for (const graphQLError of err.graphQLErrors) {
          notify({
            kind: "error",
            title: "Failed to execute mutation",
            message: graphQLError.message,
            error: err,
          });
        }
      }
      else {
        notify({
          kind: "error",
          title: "Failed to execute mutation",
          message: err.message,
          error: err,
        });
      }
    }

    throw err;
  }

  // `null` is a server that answered with an empty payload; `undefined` is one that
  // answered with no data at all. Upstream checked only for `null` and then read
  // `.errors` off `undefined`, which threw a TypeError instead of this message.
  if (data.value === null || data.value === undefined) {
    throw new Error("Mutation failed: the server returned no payload.");
  }

  const value = unref(data.value) as Result;

  const errors = value.errors as IError[];
  if (errors && errors.length > 0) {
    let handled = true;

    for (const err of errors) {
      const handler = onError?.[`on${err.code}`] as ((err: IError) => boolean | void) | undefined;
      if (!handler) {
        handled = false;
        continue;
      }

      // Only an explicit `false` declines; a handler that just does its work and returns
      // nothing has handled the error.
      if (handler(err) === false) {
        handled = false;
      }
    }

    throw new GqlResponseError(errors[0]!, handled);
  }

  // The signature promises the `errors` field is gone, so actually drop it: a caller that
  // spreads this into a payload should not carry an empty `errors` array back out.
  const { errors: _handled, ...payload } = value;

  return payload as NonNullableFields<Omit<Result, "errors">>;
}
