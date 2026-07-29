/**
 * Combines the caller's abort signal with a timeout, if either exists.
 *
 * A layer cannot pick a timeout for everyone — a reporting query may legitimately take a
 * minute — so `gql.requestTimeoutMs` is off by default. It matters most during SSR, where
 * an unresponsive endpoint otherwise holds the render open until the server gives up.
 *
 * @returns the signal to send with the request, or `undefined` when there is nothing to
 * abort on.
 */
export function makeRequestSignal(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number | undefined,
): AbortSignal | undefined {
  if (!timeoutMs || timeoutMs <= 0) {
    return callerSignal;
  }

  const timeout = AbortSignal.timeout(timeoutMs);
  if (!callerSignal) {
    return timeout;
  }

  // `AbortSignal.any` is Node 20.3+ / Chrome 116+ / Safari 17.4+. Older runtimes keep the
  // caller's signal, which is the one they can actually act on.
  return typeof AbortSignal.any === "function"
    ? AbortSignal.any([callerSignal, timeout])
    : callerSignal;
}
