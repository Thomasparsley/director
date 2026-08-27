import { afterEach, describe, expect, it, vi } from "vitest";

import { RateLimitScopes, readRateLimitRejection } from "./rateLimit";

function jsonResponse(body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status: 429, headers });
}

describe("readRateLimitRejection", () => {
  afterEach(() => vi.useRealTimers());

  it("reads the scope and the seconds the limiter sent", async () => {
    const rejection = await readRateLimitRejection(
      jsonResponse({ scope: "login", retryAfterSeconds: 34 }),
    );

    expect(rejection).toEqual({ scope: RateLimitScopes.Login, retryAfterSeconds: 34 });
  });

  it("rounds a fractional wait up, so the advice is never short", async () => {
    const rejection = await readRateLimitRejection(jsonResponse({ retryAfterSeconds: 12.1 }));

    expect(rejection.retryAfterSeconds).toBe(13);
  });

  it("drops a scope it does not know rather than passing it on", async () => {
    // A scope the caller cannot interpret is worse than none: it would look like a
    // limiter we recognise and be compared against `Global` as if it meant something.
    const rejection = await readRateLimitRejection(jsonResponse({ scope: "shard-7" }));

    expect(rejection.scope).toBeUndefined();
  });

  it("yields an empty rejection for a body that is not ours", async () => {
    const rejection = await readRateLimitRejection(new Response("Too Many Requests", { status: 429 }));

    expect(rejection).toEqual({ scope: undefined, retryAfterSeconds: undefined });
  });

  it("falls back to a numeric Retry-After header when the body carries no seconds", async () => {
    const rejection = await readRateLimitRejection(jsonResponse({ scope: "global" }, { "Retry-After": "60" }));

    expect(rejection).toEqual({ scope: RateLimitScopes.Global, retryAfterSeconds: 60 });
  });

  it("reads an HTTP-date Retry-After as the seconds left until it", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T10:00:00Z"));

    const rejection = await readRateLimitRejection(
      new Response(null, { status: 429, headers: { "Retry-After": "Thu, 27 Aug 2026 10:00:45 GMT" } }),
    );

    expect(rejection.retryAfterSeconds).toBe(45);
  });

  it("reports a Retry-After date already past as no wait at all, not a negative one", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T10:01:00Z"));

    const rejection = await readRateLimitRejection(
      new Response(null, { status: 429, headers: { "Retry-After": "Thu, 27 Aug 2026 10:00:45 GMT" } }),
    );

    expect(rejection.retryAfterSeconds).toBe(0);
  });

  it("ignores a Retry-After header that is neither seconds nor a date", async () => {
    const rejection = await readRateLimitRejection(
      new Response(null, { status: 429, headers: { "Retry-After": "soon" } }),
    );

    expect(rejection.retryAfterSeconds).toBeUndefined();
  });

  it("prefers the body's seconds over the header", async () => {
    const rejection = await readRateLimitRejection(
      jsonResponse({ retryAfterSeconds: 5 }, { "Retry-After": "600" }),
    );

    expect(rejection.retryAfterSeconds).toBe(5);
  });
});
