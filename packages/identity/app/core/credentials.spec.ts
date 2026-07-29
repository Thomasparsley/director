import { describe, expect, it } from "vitest";

import { buildLoginCredentials } from "./credentials";

describe("buildLoginCredentials", () => {
  it("treats a value containing @ as an email", () => {
    expect(buildLoginCredentials("user@example.com", "pw")).toEqual({
      email: "user@example.com",
      password: "pw",
    });
  });

  it("treats a value without @ as a username", () => {
    expect(buildLoginCredentials("username", "pw")).toEqual({
      username: "username",
      password: "pw",
    });
  });

  it("carries the password through unchanged", () => {
    expect(buildLoginCredentials("a@b.c", "  spaced  ")).toEqual({
      email: "a@b.c",
      password: "  spaced  ",
    });
  });
});
