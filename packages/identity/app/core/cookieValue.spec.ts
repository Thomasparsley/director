import { describe, expect, it } from "vitest";

import { parseBooleanCookie } from "./cookieValue";

describe("parseBooleanCookie", () => {
  describe("returns true", () => {
    it("returns true for JSON-encoded true", () => {
      expect(parseBooleanCookie("true")).toBe(true);
    });

    it("returns true for a real boolean true (as `useCookie` decodes it via destr)", () => {
      expect(parseBooleanCookie(true)).toBe(true);
    });
  });

  describe("returns false", () => {
    it("returns false for a real boolean false", () => {
      expect(parseBooleanCookie(false)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(parseBooleanCookie(undefined)).toBe(false);
    });

    it("returns false for null", () => {
      expect(parseBooleanCookie(null)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(parseBooleanCookie("")).toBe(false);
    });

    it("returns false for JSON-encoded false", () => {
      expect(parseBooleanCookie("false")).toBe(false);
    });

    it("returns false for JSON-encoded number", () => {
      expect(parseBooleanCookie("1")).toBe(false);
    });

    it("returns false for JSON-encoded string", () => {
      expect(parseBooleanCookie("\"true\"")).toBe(false);
    });

    it("returns false (does not throw) for a malformed, non-JSON value", () => {
      expect(parseBooleanCookie("tru")).toBe(false);
    });
  });
});
