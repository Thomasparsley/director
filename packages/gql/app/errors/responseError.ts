/**
 * A payload-level GraphQL error — one entry from a mutation result's `errors` list,
 * as opposed to a transport or GraphQL-execution failure (which urql reports as a
 * `CombinedError`).
 *
 * `handled` records whether every error in the batch was claimed by an `on<Code>`
 * handler passed to {@link handleMutationResult}. A caller can therefore let a handled
 * error unwind the call stack without also surfacing it to the user a second time.
 */
export class GqlResponseError extends Error {
  constructor(
    public detail: { code: string, message: string },
    public readonly handled: boolean = false,
  ) {
    super(`[${detail.code}] ${detail.message}`);
    this.name = "GqlResponseError";
  }
}
