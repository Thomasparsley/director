import { beforeEach, describe, expect, it, vi } from "vitest";
import { CombinedError } from "@urql/core";

import { resetNuxtAppStub } from "#layers/director-gql/test/nuxtApp";

import { notifyOnGqlError } from "./notifyOnError";

const notify = vi.fn();

describe("notifyOnGqlError", () => {
  beforeEach(() => {
    notify.mockClear();
    resetNuxtAppStub({ gql: { url: "u", notify } });
  });

  it("describes the failure for the app to render", () => {
    const error = new CombinedError({ graphQLErrors: ["boom"] });

    notifyOnGqlError(error);

    expect(notify).toHaveBeenCalledOnce();
    expect(notify.mock.calls[0]![0]).toEqual({
      kind: "error",
      title: error.name,
      message: error.message,
      error,
    });
  });

  it("passes a network failure through the same channel", () => {
    const error = new CombinedError({ networkError: new Error("offline") });

    notifyOnGqlError(error);

    expect(notify.mock.calls[0]![0]).toMatchObject({ message: error.message });
  });

  it("is silent — and does not throw — when the app configured no notify", () => {
    resetNuxtAppStub({ gql: { url: "u" } });

    expect(() => notifyOnGqlError(new CombinedError({ graphQLErrors: ["boom"] }))).not.toThrow();
    expect(notify).not.toHaveBeenCalled();
  });
});
