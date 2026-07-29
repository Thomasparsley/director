import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createKeepAliveController } from "./keepAliveController";

const MIN = 60_000;
const BASE = 1_700_000_000_000;
const CONFIG = { countdownMs: 2 * MIN, safetyMarginMs: 5_000 };

function setup(options: { expiry?: number | null } = {}) {
  const state = { expiry: options.expiry ?? BASE + 30 * MIN };
  const openKeepAliveDialog = vi.fn();
  const closeKeepAliveDialog = vi.fn();
  const refreshNow = vi.fn().mockResolvedValue(undefined);
  const expireSession = vi.fn();

  const controller = createKeepAliveController({
    now: () => Date.now(),
    setTimer: (cb, ms) => setTimeout(cb, ms),
    clearTimer: h => clearTimeout(h as ReturnType<typeof setTimeout>),
    getExpiryMs: () => state.expiry,
    openKeepAliveDialog,
    closeKeepAliveDialog,
    refreshNow,
    expireSession,
    config: CONFIG,
  });

  return { controller, openKeepAliveDialog, closeKeepAliveDialog, refreshNow, expireSession, state };
}

describe("createKeepAliveController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens the dialog with a deadline one countdown ahead", () => {
    const { controller, openKeepAliveDialog } = setup({ expiry: BASE + 30 * MIN });
    controller.requestKeepAlive();

    expect(controller.isOpen).toBe(true);
    expect(openKeepAliveDialog).toHaveBeenCalledWith(BASE + 2 * MIN);
  });

  it("clamps the deadline to the token expiry minus the safety margin", () => {
    const { controller, openKeepAliveDialog } = setup({ expiry: BASE + 60_000 });
    controller.requestKeepAlive();

    expect(openKeepAliveDialog).toHaveBeenCalledWith(BASE + 60_000 - CONFIG.safetyMarginMs);
  });

  it("expires the session when the countdown elapses", async () => {
    const { controller, expireSession, closeKeepAliveDialog } = setup({ expiry: BASE + 30 * MIN });
    controller.requestKeepAlive();

    await vi.advanceTimersByTimeAsync(2 * MIN);

    expect(expireSession).toHaveBeenCalledWith("idle-timeout");
    expect(closeKeepAliveDialog).toHaveBeenCalled();
    expect(controller.isOpen).toBe(false);
  });

  it("renews and closes on confirm, without expiring", async () => {
    const { controller, refreshNow, expireSession, closeKeepAliveDialog } = setup({ expiry: BASE + 30 * MIN });
    controller.requestKeepAlive();

    await controller.confirm();

    expect(refreshNow).toHaveBeenCalledTimes(1);
    expect(closeKeepAliveDialog).toHaveBeenCalled();
    expect(controller.isOpen).toBe(false);

    // The timeout must not fire after a confirm.
    await vi.advanceTimersByTimeAsync(5 * MIN);
    expect(expireSession).not.toHaveBeenCalled();
  });

  it("skips the prompt and expires when there is no headroom left", () => {
    // Expiry is already within the safety margin → deadline <= now.
    const { controller, openKeepAliveDialog, expireSession } = setup({ expiry: BASE + 1_000 });
    controller.requestKeepAlive();

    expect(openKeepAliveDialog).not.toHaveBeenCalled();
    expect(expireSession).toHaveBeenCalledWith("idle-timeout");
  });

  it("ignores a second request while already open", () => {
    const { controller, openKeepAliveDialog } = setup({ expiry: BASE + 30 * MIN });
    controller.requestKeepAlive();
    controller.requestKeepAlive();

    expect(openKeepAliveDialog).toHaveBeenCalledTimes(1);
  });

  it("handleExpired closes the dialog and expires with the given reason", () => {
    const { controller, expireSession, closeKeepAliveDialog } = setup({ expiry: BASE + 30 * MIN });
    controller.requestKeepAlive();

    controller.handleExpired("wake-expired");

    expect(closeKeepAliveDialog).toHaveBeenCalled();
    expect(expireSession).toHaveBeenCalledWith("wake-expired");
  });

  it("cancel tears down without expiring", async () => {
    const { controller, expireSession, closeKeepAliveDialog } = setup({ expiry: BASE + 30 * MIN });
    controller.requestKeepAlive();

    controller.cancel();

    expect(closeKeepAliveDialog).toHaveBeenCalled();
    expect(controller.isOpen).toBe(false);
    await vi.advanceTimersByTimeAsync(5 * MIN);
    expect(expireSession).not.toHaveBeenCalled();
  });
});
