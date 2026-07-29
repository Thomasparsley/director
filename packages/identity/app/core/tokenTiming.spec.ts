import { describe, expect, it } from "vitest";

import {
  computeRefreshDelayMs,
  isTokenExpired,
  isWithinRefreshWindow,
  parseExpiry,
  timeUntilExpiryMs,
} from "./tokenTiming";

const MIN = 60_000;
const NOW = 1_000_000_000_000; // fixed reference "now"

describe("tokenTiming", () => {
  describe("isTokenExpired", () => {
    it("is false before expiry", () => {
      expect(isTokenExpired(NOW + MIN, NOW)).toBe(false);
    });

    it("is true exactly at expiry", () => {
      expect(isTokenExpired(NOW, NOW)).toBe(true);
    });

    it("is true after expiry", () => {
      expect(isTokenExpired(NOW - MIN, NOW)).toBe(true);
    });
  });

  describe("isWithinRefreshWindow", () => {
    const lead = 2 * MIN;

    it("is false when expiry is far beyond the lead window", () => {
      expect(isWithinRefreshWindow(NOW + 10 * MIN, NOW, lead)).toBe(false);
    });

    it("is true exactly at the lead boundary", () => {
      expect(isWithinRefreshWindow(NOW + lead, NOW, lead)).toBe(true);
    });

    it("is true once inside the lead window", () => {
      expect(isWithinRefreshWindow(NOW + MIN, NOW, lead)).toBe(true);
    });

    it("is true when already expired", () => {
      expect(isWithinRefreshWindow(NOW - MIN, NOW, lead)).toBe(true);
    });
  });

  describe("computeRefreshDelayMs", () => {
    const opts = { leadMs: 2 * MIN, minDelayMs: 5_000 };

    it("schedules lead time before expiry for a token far in the future", () => {
      // expires in 30 min, lead 2 min -> refresh in 28 min
      expect(computeRefreshDelayMs(NOW + 30 * MIN, NOW, opts)).toBe(28 * MIN);
    });

    it("floors at minDelayMs when already inside the lead window", () => {
      expect(computeRefreshDelayMs(NOW + MIN, NOW, opts)).toBe(5_000);
    });

    it("floors at minDelayMs when already expired (never negative)", () => {
      expect(computeRefreshDelayMs(NOW - 10 * MIN, NOW, opts)).toBe(5_000);
    });
  });

  describe("timeUntilExpiryMs", () => {
    it("returns the remaining time before expiry", () => {
      expect(timeUntilExpiryMs(NOW + 90_000, NOW)).toBe(90_000);
    });

    it("floors at 0 when expired", () => {
      expect(timeUntilExpiryMs(NOW - 90_000, NOW)).toBe(0);
    });
  });

  describe("parseExpiry", () => {
    it("parses an ISO string to epoch ms", () => {
      const iso = "2030-01-01T00:00:00.000Z";
      expect(parseExpiry(iso)).toBe(Date.parse(iso));
    });

    it("returns null for null/undefined/empty", () => {
      expect(parseExpiry(null)).toBeNull();
      expect(parseExpiry(undefined)).toBeNull();
      expect(parseExpiry("")).toBeNull();
    });

    it("returns null (not NaN) for an unparseable value", () => {
      expect(parseExpiry("not-a-date")).toBeNull();
    });
  });
});
