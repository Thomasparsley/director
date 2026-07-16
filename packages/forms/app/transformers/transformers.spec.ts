import { describe, expect, test } from "vitest";

import {
  arrayEmptyAsNullTransformer,
  numberEnsureTransformer,
  objectEmptyAsNullTransformer,
  stringEmptyAsNullTransformer,
  stringTrimTransformer,
  valueEmptyAsNullTransformer,
} from ".";

describe("string transformers", () => {
  test("stringTrimTransformer", () => {
    expect(stringTrimTransformer("  John  ")).toBe("John");
    expect(stringTrimTransformer(null)).toBe("");
    expect(stringTrimTransformer(undefined)).toBe("");
  });

  test("stringEmptyAsNullTransformer", () => {
    expect(stringEmptyAsNullTransformer("John")).toBe("John");
    expect(stringEmptyAsNullTransformer("")).toBeNull();
    expect(stringEmptyAsNullTransformer(null)).toBeNull();
  });
});

describe("numberEnsureTransformer", () => {
  test("passes numbers through and parses numeric strings", () => {
    expect(numberEnsureTransformer(5)).toBe(5);
    expect(numberEnsureTransformer("5.5")).toBe(5.5);
  });

  test("falls back to 0 for anything else", () => {
    expect(numberEnsureTransformer("")).toBe(0);
    expect(numberEnsureTransformer("  ")).toBe(0);
    expect(numberEnsureTransformer(null)).toBe(0);
    expect(numberEnsureTransformer({})).toBe(0);
  });
});

describe("arrayEmptyAsNullTransformer", () => {
  test("empty arrays become null", () => {
    expect(arrayEmptyAsNullTransformer([])).toBeNull();
    expect(arrayEmptyAsNullTransformer(null)).toBeNull();
    expect(arrayEmptyAsNullTransformer(["a"])).toEqual(["a"]);
  });
});

describe("objectEmptyAsNullTransformer", () => {
  test("empty objects become null", () => {
    expect(objectEmptyAsNullTransformer({})).toBeNull();
    expect(objectEmptyAsNullTransformer(null)).toBeNull();
    expect(objectEmptyAsNullTransformer({ a: 1 })).toEqual({ a: 1 });
  });
});

describe("valueEmptyAsNullTransformer", () => {
  test("null, undefined and empty strings become null", () => {
    expect(valueEmptyAsNullTransformer(null)).toBeNull();
    expect(valueEmptyAsNullTransformer(undefined)).toBeNull();
    expect(valueEmptyAsNullTransformer("")).toBeNull();
    expect(valueEmptyAsNullTransformer("John")).toBe("John");
    expect(valueEmptyAsNullTransformer(0)).toBe(0);
  });
});
