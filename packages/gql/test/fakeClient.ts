import { fromValue, never } from "wonka";
import type { Source } from "wonka";
import type { CombinedError, Operation, OperationResult } from "@urql/core";

/**
 * A stand-in for urql's `Client` covering only the two methods the layer's executors
 * call. Tests drive it by choosing what its source emits — a result, an error, or
 * nothing at all (for abort/teardown paths).
 */
export interface FakeClient {
  /** The context object each `createRequestOperation` call was given, in order. */
  contexts: unknown[]
  /** The operations that were actually executed. */
  executed: unknown[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createRequestOperation: (kind: string, request: any, context?: unknown) => any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executeRequestOperation: (operation: any) => Source<OperationResult>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscription: (...args: any[]) => unknown
}

interface FakeClientOptions {
  /** Emitted once, then the source completes. */
  result?: Partial<OperationResult>
  /** When set, the source never emits and never completes — for teardown tests. */
  pendingForever?: boolean
  /**
   * When set, the promise form of the source rejects with this. urql surfaces most
   * failures as a result carrying `error`, but a throw inside an exchange escapes as a
   * rejection — which is the path `executeMutation` used to swallow.
   */
  rejectWith?: unknown
}

export function makeFakeClient(options: FakeClientOptions = {}): FakeClient {
  const contexts: unknown[] = [];
  const executed: unknown[] = [];

  return {
    contexts,
    executed,

    createRequestOperation: (kind, request, context) => {
      contexts.push(context);
      return { kind, ...request, context };
    },

    executeRequestOperation: (operation) => {
      executed.push(operation);

      const result = {
        operation,
        data: undefined,
        error: undefined,
        stale: false,
        hasNext: false,
        ...options.result,
      } as OperationResult;

      const source = options.pendingForever
        ? (never as Source<OperationResult>)
        : fromValue(result);

      // urql hands back a source that is ALSO thenable-ish (`withPromise`); the mutation
      // executor uses that form while the query executor pipes the source.
      return Object.assign(source, {
        toPromise: () =>
          "rejectWith" in options
            ? Promise.reject(options.rejectWith)
            : Promise.resolve(result),
      });
    },

    subscription: (...args) => ({ args }),
  };
}

/** Shorthand for an urql-shaped failure result. */
export function errorResult(error: CombinedError): Partial<OperationResult> {
  return { error, data: undefined };
}
