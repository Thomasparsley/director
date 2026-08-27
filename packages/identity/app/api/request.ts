import { defaultIdentityTiming } from "../config";

export interface ExecuteRequestOptions extends RequestInit {
  /**
   * Abort the request after this many ms. Defaults to
   * `defaultIdentityTiming.requestTimeoutMs`; pass `0` to disable. Ignored when the
   * caller supplies its own `signal` (then the caller owns cancellation).
   */
  timeoutMs?: number
}

/**
 * Sends a JSON request to the identity REST API with the shared defaults every
 * endpoint needs: JSON content type, no caching, cookie credentials, and a
 * bounded timeout so a hung endpoint surfaces as a rejected promise (which the
 * API clients translate into a network-error `Result`) instead of hanging the
 * refresh loop or a login attempt forever.
 */
export function executeRequest(
  url: string,
  options: ExecuteRequestOptions = {},
): Promise<Response> {
  const { timeoutMs = defaultIdentityTiming.requestTimeoutMs, ...requestInit } = options;

  // Caller options win over the defaults; headers merge key-by-key (the clients only
  // ever pass plain-object headers, so no `Headers` handling is needed here).
  const init: RequestInit = {
    cache: "no-cache",
    credentials: "include",
    ...requestInit,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(requestInit.headers as Record<string, string> | undefined),
    },
  };

  if (!init.signal && timeoutMs > 0 && canUseAbortTimeout()) {
    init.signal = AbortSignal.timeout(timeoutMs);
  }

  return fetch(url, init);
}

function canUseAbortTimeout(): boolean {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function";
}

/**
 * Did the request go out and never come back, as opposed to never opening at all?
 *
 * `AbortSignal.timeout` rejects with a `TimeoutError` DOMException; a caller-owned abort
 * rejects with `AbortError`. Both mean "no answer came back" — which deserves different
 * advice from an unreachable server, the one case where "check your connection" is the
 * right thing to tell someone. Every identity client keeps the two apart with this.
 */
export function isTimeoutError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  return name === "TimeoutError" || name === "AbortError";
}

/** Parses a JSON body, returning `null` (never throwing) on invalid/empty JSON. */
export async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  }
  catch {
    return null;
  }
}
