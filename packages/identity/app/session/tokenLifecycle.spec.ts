import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTokenLifecycle } from "./tokenLifecycle";

const MIN = 60_000;
const BASE = 1_700_000_000_000;
const CONFIG = { leadMs: 2 * MIN, minDelayMs: 5_000, maxRetries: 3, retryBaseMs: 1_000 };

interface SetupOptions {
  expiry?: number | null
  token?: boolean
  refresh?: () => Promise<void>
  shouldRenew?: () => boolean
}

function setup(options: SetupOptions = {}) {
  const state = {
    expiry: options.expiry ?? BASE + 30 * MIN,
    token: options.token ?? true,
  };

  // Default refresh slides the expiry forward, mimicking a real token renewal.
  const refresh = vi.fn(options.refresh ?? (async () => {
    state.expiry = Date.now() + 30 * MIN;
  }));
  const onExpired = vi.fn();
  const onIdleRefreshDue = vi.fn();
  const reloadCookie = vi.fn();

  const lifecycle = createTokenLifecycle({
    now: () => Date.now(),
    setTimer: (cb, ms) => setTimeout(cb, ms),
    clearTimer: h => clearTimeout(h as ReturnType<typeof setTimeout>),
    sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
    getExpiryMs: () => state.expiry,
    hasToken: () => state.token,
    reloadCookie,
    refresh,
    onExpired,
    onIdleRefreshDue,
    shouldRenew: options.shouldRenew ?? (() => true),
    config: CONFIG,
  });

  return { lifecycle, state, refresh, onExpired, onIdleRefreshDue, reloadCookie };
}

describe("createTokenLifecycle - scheduling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes leadMs before expiry, not sooner", async () => {
    const { lifecycle, refresh } = setup({ expiry: BASE + 30 * MIN });
    lifecycle.resume();

    await vi.advanceTimersByTimeAsync(28 * MIN - 1);
    expect(refresh).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("re-arms after a successful refresh (sliding session)", async () => {
    const { lifecycle, refresh } = setup({ expiry: BASE + 30 * MIN });
    lifecycle.resume();

    await vi.advanceTimersByTimeAsync(28 * MIN);
    expect(refresh).toHaveBeenCalledTimes(1);

    // Next window opens 28 min after the refresh slid the expiry forward.
    await vi.advanceTimersByTimeAsync(28 * MIN);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("does not refresh after pause", async () => {
    const { lifecycle, refresh } = setup({ expiry: BASE + 30 * MIN });
    lifecycle.resume();
    lifecycle.pause();

    await vi.advanceTimersByTimeAsync(60 * MIN);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reschedule re-arms for a shortened expiry", async () => {
    const { lifecycle, state, refresh } = setup({ expiry: BASE + 30 * MIN });
    lifecycle.resume();

    state.expiry = BASE + 10 * MIN;
    lifecycle.reschedule();

    await vi.advanceTimersByTimeAsync(8 * MIN);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("defers to onIdleRefreshDue instead of refreshing when idle", async () => {
    const { lifecycle, refresh, onIdleRefreshDue } = setup({
      expiry: BASE + 30 * MIN,
      shouldRenew: () => false,
    });
    lifecycle.resume();

    await vi.advanceTimersByTimeAsync(28 * MIN);
    expect(refresh).not.toHaveBeenCalled();
    expect(onIdleRefreshDue).toHaveBeenCalledTimes(1);
  });
});

describe("createTokenLifecycle - wake resync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports expired when the machine slept past the token expiry", async () => {
    const { lifecycle, refresh, onExpired } = setup({ expiry: BASE + 30 * MIN });
    lifecycle.resume();

    // Simulate a suspended tab: jump the clock without firing the timer.
    vi.setSystemTime(BASE + 40 * MIN);
    lifecycle.resync();

    expect(onExpired).toHaveBeenCalledWith("wake-expired");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reports expired when the token cookie was dropped while backgrounded", () => {
    const { lifecycle, state, onExpired, reloadCookie } = setup({ expiry: BASE + 30 * MIN });
    lifecycle.resume();

    state.token = false; // browser evicted the expiring cookie
    lifecycle.resync();

    expect(reloadCookie).toHaveBeenCalled();
    expect(onExpired).toHaveBeenCalledWith("wake-expired");
  });

  it("refreshes on wake when renewal is already due", () => {
    const { lifecycle, refresh, onExpired } = setup({ expiry: BASE + 30 * MIN });
    lifecycle.resume();

    vi.setSystemTime(BASE + 29 * MIN); // inside the 2-min lead window
    lifecycle.resync();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it("re-arms without refreshing on wake when renewal is not yet due", async () => {
    const { lifecycle, refresh } = setup({ expiry: BASE + 30 * MIN });
    lifecycle.resume();

    vi.setSystemTime(BASE + 5 * MIN);
    lifecycle.resync();
    expect(refresh).not.toHaveBeenCalled();

    // From base+5min the window opens at base+28min → 23 min later.
    await vi.advanceTimersByTimeAsync(23 * MIN);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe("createTokenLifecycle - single-flight & retries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces concurrent refresh triggers into one call", async () => {
    let resolveRefresh: (() => void) | undefined;
    const refresh = vi.fn(() => new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    }));
    const { lifecycle } = setup({ refresh });

    lifecycle.resume();
    const a = lifecycle.refreshNow();
    const b = lifecycle.refreshNow();

    expect(refresh).toHaveBeenCalledTimes(1);
    resolveRefresh?.();
    await Promise.all([a, b]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("retries with exponential backoff and then succeeds", async () => {
    const refresh = vi.fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce(undefined);
    const { lifecycle } = setup({ expiry: BASE + 30 * MIN, refresh });

    lifecycle.resume();
    // Fire at 28 min, first attempt fails, retry after 1s succeeds.
    await vi.advanceTimersByTimeAsync(28 * MIN + 1_000);

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("gives up after maxRetries without throwing", async () => {
    const refresh = vi.fn().mockRejectedValue(new Error("still broken"));
    const { lifecycle } = setup({ expiry: BASE + 30 * MIN, refresh });

    lifecycle.resume();
    // 28 min to fire, then 1s + 2s backoff covers all three attempts.
    await vi.advanceTimersByTimeAsync(28 * MIN + 1_000 + 2_000);

    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("refreshNow bypasses the idle gate", async () => {
    const { lifecycle, refresh } = setup({ shouldRenew: () => false });
    lifecycle.resume();

    await lifecycle.refreshNow();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
