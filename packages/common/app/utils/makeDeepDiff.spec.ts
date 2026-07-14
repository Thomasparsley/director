import { describe, test } from "vitest";

import { makeDeepDiff } from "./makeDeepDiff";

describe("Common Utils - DeepDiff", () => {
  test("Simple object difference", ({ expect }) => {
    const objA = { a: 1, b: 2 };
    const objB = { a: 1, b: 3, c: 4 };

    expect(makeDeepDiff(objA, objB)).toStrictEqual({ b: 3, c: 4 });
  });

  test("Nested object difference", ({ expect }) => {
    const objA = {
      a: 1,
      b: { x: 1, y: 2 },
    };
    const objB = {
      a: 1,
      b: { x: 1, y: 3, z: 4 },
    };

    expect(makeDeepDiff(objA, objB)).toStrictEqual({ b: { y: 3, z: 4 } });
  });

  test("Array difference", ({ expect }) => {
    const objA = {
      arr: [1, 2, 3],
    };
    const objB = {
      arr: [1, 2, 4],
    };

    expect(makeDeepDiff(objA, objB)).toStrictEqual({ arr: [1, 2, 4] });
  });

  test("Mixed nested difference", ({ expect }) => {
    const objA = {
      a: 1,
      b: {
        x: [1, 2],
        y: { p: 1, q: 2 },
      },
    };
    const objB = {
      a: 1,
      b: {
        x: [1, 3],
        y: { p: 1, q: 3, r: 4 },
      },
      c: 5,
    };

    expect(makeDeepDiff(objA, objB)).toStrictEqual({
      b: {
        x: [1, 3],
        y: { q: 3, r: 4 },
      },
      c: 5,
    },
    );
  });
});
