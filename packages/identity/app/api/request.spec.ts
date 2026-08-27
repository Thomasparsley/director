import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { executeRequest, isTimeoutError, parseJsonResponse } from "./request";

describe("executeRequest", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function lastInit(): RequestInit {
    return fetchMock.mock.calls.at(-1)![1] as RequestInit;
  }

  it("applies JSON, no-cache and credentials defaults", () => {
    executeRequest("/login", { method: "post" });
    const init = lastInit();
    expect(init.method).toBe("post");
    expect(init.credentials).toBe("include");
    expect(init.cache).toBe("no-cache");
    expect((init.headers as Record<string, string>)["Content-Type"]).toContain("application/json");
  });

  it("forwards the caller's body", () => {
    executeRequest("/login", { method: "post", body: JSON.stringify({ a: 1 }) });
    expect(lastInit().body).toBe(JSON.stringify({ a: 1 }));
  });

  it("attaches a timeout signal by default", () => {
    executeRequest("/login");
    expect(lastInit().signal).toBeInstanceOf(AbortSignal);
  });

  it("does not attach a timeout when disabled", () => {
    executeRequest("/login", { timeoutMs: 0 });
    expect(lastInit().signal).toBeUndefined();
  });

  it("preserves a caller-supplied signal instead of overriding it", () => {
    const controller = new AbortController();
    executeRequest("/login", { signal: controller.signal });
    expect(lastInit().signal).toBe(controller.signal);
  });

  it("does not leak timeoutMs into the fetch init", () => {
    executeRequest("/login", { timeoutMs: 1234 });
    expect("timeoutMs" in lastInit()).toBe(false);
  });
});

describe("parseJsonResponse", () => {
  it("returns the parsed body on valid JSON", async () => {
    const res = new Response(JSON.stringify({ ok: true }), { status: 200 });
    expect(await parseJsonResponse<{ ok: boolean }>(res)).toEqual({ ok: true });
  });

  it("returns null on invalid JSON instead of throwing", async () => {
    const res = new Response("not json", { status: 200 });
    expect(await parseJsonResponse(res)).toBeNull();
  });
});

describe("isTimeoutError", () => {
  it("recognises the DOMException AbortSignal.timeout rejects with", () => {
    expect(isTimeoutError(new DOMException("timed out", "TimeoutError"))).toBe(true);
  });

  it("recognises a caller-owned abort, which also means no answer came back", () => {
    expect(isTimeoutError(new DOMException("aborted", "AbortError"))).toBe(true);
  });

  it("does not claim a connection that never opened timed out", () => {
    // The distinction is the whole point: only this one is a reason to tell someone to
    // go and look at their own connection.
    expect(isTimeoutError(new TypeError("Failed to fetch"))).toBe(false);
  });

  it("survives a rejection that is not an object at all", () => {
    expect(isTimeoutError(null)).toBe(false);
    expect(isTimeoutError("TimeoutError")).toBe(false);
  });
});
