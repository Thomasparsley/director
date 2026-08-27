import { parseJsonResponse } from "./request";

/**
 * Which limiter refused the request, as the shipped REST contract names it in the 429
 * body. The distinction is the whole point: the login partition means "too many login
 * attempts", the global one means "too many requests from this address" — which may
 * well be a *first* login attempt sitting behind a very busy tab, and telling that
 * person to stop guessing their password is the wrong sentence entirely.
 *
 * A backend that names its scopes differently simply produces no scope here, and the
 * caller keeps whatever its own endpoint implies.
 */
export const RateLimitScopes = {
  Login: "login",
  TokenRefresh: "token-refresh",
  Global: "global",
} as const;

export type RateLimitScope = typeof RateLimitScopes[keyof typeof RateLimitScopes];

export interface RateLimitRejection {
  /**
   * Absent when the 429 did not come from a limiter that names itself — a proxy or a CDN
   * can refuse a request too, and so can a backend that answers in plain text. The caller
   * then keeps the meaning its own endpoint implies rather than guessing.
   */
  readonly scope?: RateLimitScope
  /** Seconds until the window resets, when the server said. */
  readonly retryAfterSeconds?: number
}

const KNOWN_SCOPES: ReadonlyArray<string> = Object.values(RateLimitScopes);

function asScope(value: unknown): RateLimitScope | undefined {
  return typeof value === "string" && KNOWN_SCOPES.includes(value)
    ? value as RateLimitScope
    : undefined;
}

function asSeconds(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.ceil(value)
    : undefined;
}

/**
 * `Retry-After` as RFC 9110 defines it: either a delay in seconds or an HTTP-date.
 *
 * Read only as a fallback, because a header is the thing a browser cannot see across
 * origins without an explicit `Access-Control-Expose-Headers` — but a backend that
 * answers a 429 with nothing but the standard header is the ordinary case for a layer
 * that does not get to choose its server, so the value is taken when it is there.
 */
function readRetryAfterHeader(response: Response): number | undefined {
  const raw = response.headers.get("Retry-After")?.trim();
  if (!raw) {
    return undefined;
  }

  const seconds = Number(raw);
  if (Number.isFinite(seconds)) {
    return asSeconds(seconds);
  }

  const at = Date.parse(raw);
  if (Number.isNaN(at)) {
    return undefined;
  }
  // A date already in the past means the window is over: zero, not a negative wait.
  return asSeconds(Math.max(0, (at - Date.now()) / 1_000));
}

/**
 * Reads what a 429 tells us. Never throws and never guesses: an unreadable body yields an
 * empty rejection, which every caller has to handle anyway because nothing between the
 * browser and the endpoint is obliged to produce one.
 */
export async function readRateLimitRejection(response: Response): Promise<RateLimitRejection> {
  const body = await parseJsonResponse<{ scope?: unknown, retryAfterSeconds?: unknown }>(response);

  return {
    scope: asScope(body?.scope),
    retryAfterSeconds: asSeconds(body?.retryAfterSeconds) ?? readRetryAfterHeader(response),
  };
}
