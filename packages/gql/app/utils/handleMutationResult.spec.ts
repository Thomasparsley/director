import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { CombinedError } from "@urql/core";

import { resetNuxtAppStub } from "#layers/director-gql/test/nuxtApp";

import { GqlResponseError } from "../errors/responseError";
import type { GqlError } from "../types/error";
import type { MutationResponse } from "../types/mutation";

import { handleMutationResult } from "./handleMutationResult";

interface Payload {
  id: string | null
  errors: { code: "EmailTaken" | "RateLimited", message: string }[]
}

function makeResponse(
  data: Partial<Payload> | null | undefined,
  error?: GqlError,
): MutationResponse<Payload> {
  return {
    data: ref(data) as MutationResponse<Payload>["data"],
    error: ref(error),
    pending: ref(false),
  };
}

const notify = vi.fn();

describe("handleMutationResult", () => {
  beforeEach(() => {
    notify.mockClear();
    resetNuxtAppStub({ gql: { url: "u", notify } });
  });

  describe("transport and execution errors", () => {
    it("announces one notice per GraphQL error and rethrows the original", () => {
      const error = new CombinedError({ graphQLErrors: ["first", "second"] });
      const response = makeResponse(undefined, error);

      expect(() => handleMutationResult({ response })).toThrow(error);

      expect(notify).toHaveBeenCalledTimes(2);
      expect(notify.mock.calls[0]![0]).toMatchObject({ kind: "error", message: "first" });
      expect(notify.mock.calls[1]![0]).toMatchObject({ kind: "error", message: "second" });
    });

    it("falls back to the combined message when there are no GraphQL errors", () => {
      const error = new CombinedError({ networkError: new Error("offline") });
      const response = makeResponse(undefined, error);

      expect(() => handleMutationResult({ response })).toThrow(error);

      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify.mock.calls[0]![0]).toMatchObject({ message: error.message, error });
    });

    it("stays silent when the app configured no notify", () => {
      resetNuxtAppStub({ gql: { url: "u" } });
      const response = makeResponse(undefined, new CombinedError({ graphQLErrors: ["boom"] }));

      expect(() => handleMutationResult({ response })).toThrow(CombinedError);
      expect(notify).not.toHaveBeenCalled();
    });
  });

  describe("a missing payload", () => {
    it("throws for null data", () => {
      expect(() => handleMutationResult({ response: makeResponse(null) }))
        .toThrow(/no payload/);
    });

    // Upstream checked only for `null` and then read `.errors` off `undefined`,
    // turning a missing payload into a TypeError.
    it("throws the same descriptive error for undefined data", () => {
      expect(() => handleMutationResult({ response: makeResponse(undefined) }))
        .toThrow(/no payload/);
    });
  });

  describe("payload-level errors", () => {
    const withErrors = () => makeResponse({
      id: null,
      errors: [{ code: "EmailTaken" as const, message: "taken" }],
    });

    it("dispatches to the handler for the error's code", () => {
      const onEmailTaken = vi.fn();
      const onRateLimited = vi.fn();

      expect(() => handleMutationResult({
        response: withErrors(),
        onError: { onEmailTaken, onRateLimited },
      })).toThrow(GqlResponseError);

      expect(onEmailTaken).toHaveBeenCalledWith({ code: "EmailTaken", message: "taken" });
      expect(onRateLimited).not.toHaveBeenCalled();
    });

    it("counts a handler that returns nothing as having handled it", () => {
      try {
        handleMutationResult({
          response: withErrors(),
          onError: { onEmailTaken: () => {}, onRateLimited: () => {} },
        });
        expect.unreachable("should have thrown");
      }
      catch (error) {
        expect(error).toBeInstanceOf(GqlResponseError);
        expect((error as GqlResponseError).handled).toBe(true);
      }
    });

    it("lets a handler decline by returning false", () => {
      try {
        handleMutationResult({
          response: withErrors(),
          onError: { onEmailTaken: () => false, onRateLimited: () => {} },
        });
        expect.unreachable("should have thrown");
      }
      catch (error) {
        expect((error as GqlResponseError).handled).toBe(false);
      }
    });

    it("is unhandled when no handlers were supplied at all", () => {
      try {
        handleMutationResult({ response: withErrors() });
        expect.unreachable("should have thrown");
      }
      catch (error) {
        expect((error as GqlResponseError).handled).toBe(false);
        expect((error as GqlResponseError).detail).toEqual({
          code: "EmailTaken",
          message: "taken",
        });
      }
    });

    it("runs every handler, and reports unhandled if any one declined", () => {
      const onEmailTaken = vi.fn(() => {});
      const onRateLimited = vi.fn(() => false);

      const response = makeResponse({
        id: null,
        errors: [
          { code: "EmailTaken" as const, message: "taken" },
          { code: "RateLimited" as const, message: "slow down" },
        ],
      });

      try {
        handleMutationResult({ response, onError: { onEmailTaken, onRateLimited } });
        expect.unreachable("should have thrown");
      }
      catch (error) {
        expect(onEmailTaken).toHaveBeenCalledOnce();
        expect(onRateLimited).toHaveBeenCalledOnce();
        expect((error as GqlResponseError).handled).toBe(false);
        // The first error is the one carried on the thrown object.
        expect((error as GqlResponseError).detail.code).toBe("EmailTaken");
      }
    });

    it("does not route payload errors to notify — that is the handlers' job", () => {
      expect(() => handleMutationResult({ response: withErrors() })).toThrow();
      expect(notify).not.toHaveBeenCalled();
    });
  });

  describe("success", () => {
    it("returns the payload when the errors list is empty", () => {
      const response = makeResponse({ id: "user-1", errors: [] });

      expect(handleMutationResult({ response })).toEqual({ id: "user-1" });
      expect(notify).not.toHaveBeenCalled();
    });

    // The signature promises `Omit<Result, "errors">`, so the value has to match it —
    // otherwise a caller spreading the result carries an empty `errors` array onward.
    it("drops the errors field it just proved empty", () => {
      const result = handleMutationResult({
        response: makeResponse({ id: "user-1", errors: [] }),
      });

      expect(result).not.toHaveProperty("errors");
    });

    it("leaves the response's own data untouched", () => {
      const response = makeResponse({ id: "user-1", errors: [] });

      handleMutationResult({ response });

      expect(response.data.value).toHaveProperty("errors");
    });

    it("returns the payload when the schema has no errors field at all", () => {
      const response = makeResponse({ id: "user-1" });

      expect(handleMutationResult({ response })).toMatchObject({ id: "user-1" });
    });
  });
});
