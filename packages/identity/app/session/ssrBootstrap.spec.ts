import { describe, expect, it, vi } from "vitest";

import { LoginErrorResults } from "../errors/identityApiErrors";

import { aUser, makeFakeApi, makeFakeStore, makeSession } from "./__testing__/sessionDoubles";
import { SessionStatuses } from "./types";

/**
 * The server-render contract of `bootstrap()`, kept apart from `sessionService.spec.ts`
 * (which covers the flows) because these assertions are about one question: what may
 * the server settle, and what must it leave for the browser?
 *
 * Getting it wrong is not a caught exception — it is a page that server-renders "Sign
 * in" at a signed-in user and swaps in their avatar once it hydrates. A Playwright
 * assertion cannot catch that: it only runs after hydration, by which point the client
 * has corrected whatever the server got wrong.
 *
 * SSR is expressed the way the plugin expresses it: `settleAnonymousOnFailure: false`
 * and `canRecover: false`.
 */
const asServer = { settleAnonymousOnFailure: false, canRecover: false } as const;

describe("bootstrap on the server", () => {
  it("settles anonymous with no call when no token was sent", async () => {
    const store = makeFakeStore();
    const { session, fetchUser } = makeSession(store, makeFakeApi());

    await session.bootstrap({ hasToken: false, ...asServer });

    expect(fetchUser).not.toHaveBeenCalled();
    expect(store.status.value).toBe(SessionStatuses.Anonymous);
  });

  it("authenticates from the incoming access token", async () => {
    const store = makeFakeStore();
    store.setHasToken(true);
    const fetchUser = vi.fn().mockResolvedValue({ success: true, value: aUser });
    const { session } = makeSession(store, makeFakeApi(), fetchUser);

    await session.bootstrap({ hasToken: true, ...asServer });

    expect(store.status.value).toBe(SessionStatuses.Authenticated);
    expect(store.user.value).toEqual(aUser);
  });

  // The half of the fix that `settleAnonymousOnFailure` was swallowing. A token the
  // API *rejected* is an answer, and the answer is "logged out" — so the server may
  // settle it. Left `unknown`, a stale cookie makes the undecided-session placeholder
  // permanent, because the client retry that would settle it never sees a difference.
  it("settles anonymous when the API rejects the token — it is an answer", async () => {
    const store = makeFakeStore();
    store.setHasToken(true);
    const fetchUser = vi.fn().mockResolvedValue({
      success: false,
      error: LoginErrorResults.IsNotAuthorizedForUserData,
    });
    const { session } = makeSession(store, makeFakeApi(), fetchUser);

    await session.bootstrap({ hasToken: true, ...asServer });

    expect(store.status.value).toBe(SessionStatuses.Anonymous);
  });

  // The other half, unchanged: silence is not an answer. Rendering a logged-out shell
  // off a question nobody managed to put is exactly the bug the flag guards against.
  it("leaves the session unknown when the backend never answered", async () => {
    const store = makeFakeStore();
    store.setHasToken(true);
    const fetchUser = vi.fn().mockResolvedValue({
      success: false,
      error: LoginErrorResults.ServerUnavailable,
    });
    const { session } = makeSession(store, makeFakeApi(), fetchUser);
    store.status.value = SessionStatuses.Unknown;

    await session.bootstrap({ hasToken: true, ...asServer });

    expect(store.status.value).toBe(SessionStatuses.Unknown);
    expect(store.setAnonymous).not.toHaveBeenCalled();
  });

  // ...and having settled nothing, it must not hold the single-flight latch shut: the
  // whole point of leaving `unknown` is that somebody gets to ask again.
  it("allows a later bootstrap to retry after a non-answer", async () => {
    const store = makeFakeStore();
    store.setHasToken(true);
    const fetchUser = vi.fn()
      .mockResolvedValueOnce({ success: false, error: LoginErrorResults.ServerUnavailable })
      .mockResolvedValueOnce({ success: true, value: aUser });
    const { session } = makeSession(store, makeFakeApi(), fetchUser);
    store.status.value = SessionStatuses.Unknown;

    await session.bootstrap({ hasToken: true, ...asServer });
    await session.whenSettled();

    expect(fetchUser).toHaveBeenCalledTimes(2);
    expect(store.status.value).toBe(SessionStatuses.Authenticated);
  });

  // The server holds no cookie jar the rotated token could be written into, so it must
  // not spend the refresh cookie — the plugin's `planSsrSession` normally keeps this
  // path off the server entirely, and `canRecover: false` is the belt to that braces.
  it("never trades the refresh cookie during SSR", async () => {
    const store = makeFakeStore();
    store.setHasRefreshToken(true);
    const api = makeFakeApi();
    const { session, fetchUser } = makeSession(store, api);

    await session.bootstrap({ hasToken: false, ...asServer });

    expect(api.sendRefreshAccessTokenRequest).not.toHaveBeenCalled();
    expect(fetchUser).not.toHaveBeenCalled();
    expect(store.status.value).toBe(SessionStatuses.Anonymous);
  });
});

describe("bootstrap on the client", () => {
  // Mirror of the server case above: on the client there is nobody left to defer to,
  // so a failure that told us nothing still has to settle rather than leave the app
  // rendering a placeholder for ever.
  it("settles anonymous even when the backend never answered", async () => {
    const store = makeFakeStore();
    store.setHasToken(true);
    const fetchUser = vi.fn().mockResolvedValue({
      success: false,
      error: LoginErrorResults.ServerUnavailable,
    });
    const { session } = makeSession(store, makeFakeApi(), fetchUser);
    store.status.value = SessionStatuses.Unknown;

    await session.bootstrap({ hasToken: true });

    expect(store.status.value).toBe(SessionStatuses.Anonymous);
  });
});
