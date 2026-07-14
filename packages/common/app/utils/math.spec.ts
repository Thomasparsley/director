import { describe, it } from "vitest";

import { lerp, toPercentage } from "./math";

describe("lerp", () => {
  it("should return `a` when n is 0", ({ expect }) => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(5, 20, 0)).toBe(5);
    expect(lerp(-10, 10, 0)).toBe(-10);
  });

  it("should return `b` when n is 1", ({ expect }) => {
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(5, 20, 1)).toBe(20);
    expect(lerp(-10, 10, 1)).toBe(10);
  });

  it("should return the midpoint when n is 0.5", ({ expect }) => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });

  it("should interpolate at arbitrary factors", ({ expect }) => {
    expect(lerp(0, 100, 0.25)).toBe(25);
    expect(lerp(0, 100, 0.75)).toBe(75);
    expect(lerp(10, 20, 0.1)).toBeCloseTo(11);
  });

  it("should extrapolate when n is outside [0, 1]", ({ expect }) => {
    expect(lerp(0, 10, 2)).toBe(20);
    expect(lerp(0, 10, -1)).toBe(-10);
  });

  it("should handle a equal to b", ({ expect }) => {
    expect(lerp(7, 7, 0.3)).toBe(7);
    expect(lerp(7, 7, 1)).toBe(7);
  });
});

describe("toPercentage", () => {
  it("should return 0 when value equals min", ({ expect }) => {
    expect(toPercentage(0, 100, 0)).toBe(0);
    expect(toPercentage(10, 20, 10)).toBe(0);
  });

  it("should return 1 when value equals max", ({ expect }) => {
    expect(toPercentage(0, 100, 100)).toBe(1);
    expect(toPercentage(10, 20, 20)).toBe(1);
  });

  it("should return the normalized fraction for values within the range", ({ expect }) => {
    expect(toPercentage(0, 100, 50)).toBe(0.5);
    expect(toPercentage(0, 200, 50)).toBe(0.25);
    expect(toPercentage(10, 20, 15)).toBe(0.5);
  });

  it("should handle negative ranges", ({ expect }) => {
    expect(toPercentage(-100, 100, 0)).toBe(0.5);
    expect(toPercentage(-50, -10, -30)).toBe(0.5);
  });

  it("should return values outside [0, 1] when value is outside the range", ({ expect }) => {
    expect(toPercentage(0, 100, 150)).toBe(1.5);
    expect(toPercentage(0, 100, -50)).toBe(-0.5);
  });

  it("should be the inverse of lerp", ({ expect }) => {
    const min = 10;
    const max = 50;
    const value = 30;
    expect(lerp(min, max, toPercentage(min, max, value))).toBe(value);
  });

  it("should return Infinity when min equals max and value differs", ({ expect }) => {
    expect(toPercentage(5, 5, 10)).toBe(Infinity);
  });

  it("should return NaN when min, max, and value are all equal", ({ expect }) => {
    expect(toPercentage(5, 5, 5)).toBeNaN();
  });
});
