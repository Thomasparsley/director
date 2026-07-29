import { describe, expect, it } from "vitest";

import { GqlResponseError } from "./responseError";

describe("GqlResponseError", () => {
  it("puts the code and message where a bare console.log would show them", () => {
    const error = new GqlResponseError({ code: "EmailTaken", message: "already in use" });

    expect(error.message).toBe("[EmailTaken] already in use");
  });

  it("keeps the original detail for callers that branch on the code", () => {
    const detail = { code: "RateLimited", message: "slow down" };

    expect(new GqlResponseError(detail).detail).toBe(detail);
  });

  it("is unhandled unless the caller says otherwise", () => {
    expect(new GqlResponseError({ code: "X", message: "y" }).handled).toBe(false);
  });

  it("records that every error found a handler", () => {
    expect(new GqlResponseError({ code: "X", message: "y" }, true).handled).toBe(true);
  });

  it("is a real Error, so it survives a throw and an instanceof check", () => {
    const error = new GqlResponseError({ code: "X", message: "y" });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("GqlResponseError");
    expect(() => {
      throw error;
    }).toThrow(GqlResponseError);
  });
});
