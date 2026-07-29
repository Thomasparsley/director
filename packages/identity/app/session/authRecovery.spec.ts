import { describe, expect, it, vi } from "vitest";

import { createAuthRecovery } from "./authRecovery";
import type { SessionStatus } from "./types";

interface Options {
  status?: SessionStatus
  authorizedAfterRefresh?: boolean
  refresh?: () => Promise<void>
  promptRelogin?: () => Promise<boolean>
}

function setup(options: Options = {}) {
  const state = { authorized: false };
  const refresh = vi.fn(options.refresh ?? (async () => {
    state.authorized = options.authorizedAfterRefresh ?? false;
  }));
  const promptRelogin = vi.fn(options.promptRelogin ?? (async () => false));

  const { recoverAuth } = createAuthRecovery({
    getStatus: () => options.status ?? "authenticated",
    isAuthorized: () => state.authorized,
    refresh,
    promptRelogin,
  });

  return { recoverAuth, refresh, promptRelogin, state };
}

describe("createAuthRecovery", () => {
  it("passes through without refreshing when not authenticated", async () => {
    const { recoverAuth, refresh, promptRelogin } = setup({ status: "anonymous" });

    await recoverAuth();

    expect(refresh).not.toHaveBeenCalled();
    expect(promptRelogin).not.toHaveBeenCalled();
  });

  it("recovers silently when a refresh restores authorization", async () => {
    const { recoverAuth, refresh, promptRelogin } = setup({ authorizedAfterRefresh: true });

    await recoverAuth();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(promptRelogin).not.toHaveBeenCalled();
  });

  it("prompts for re-login when the refresh cannot restore the session", async () => {
    const { recoverAuth, refresh, promptRelogin } = setup({ authorizedAfterRefresh: false });

    await recoverAuth();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(promptRelogin).toHaveBeenCalledTimes(1);
  });

  it("is single-flight — concurrent calls share one recovery", async () => {
    let releaseRefresh: (() => void) | undefined;
    const refresh = () => new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const { recoverAuth, promptRelogin } = setup({ refresh, authorizedAfterRefresh: false });

    const a = recoverAuth();
    const b = recoverAuth();
    releaseRefresh?.();
    await Promise.all([a, b]);

    // promptRelogin runs once despite two concurrent triggers.
    expect(promptRelogin).toHaveBeenCalledTimes(1);
  });

  it("can recover again after a previous recovery settled", async () => {
    const { recoverAuth, promptRelogin } = setup({ authorizedAfterRefresh: false });

    await recoverAuth();
    await recoverAuth();

    expect(promptRelogin).toHaveBeenCalledTimes(2);
  });
});
