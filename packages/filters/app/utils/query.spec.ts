import { describe, expect, test } from "vitest";

import { deserializeQueryData, serializeQueryData } from "./query";

interface Shape {
  year: number
  name: string
  tags: Array<string>
}

describe("query serialization", () => {
  test("round-trips plain filter data", () => {
    const data = { year: 2026, name: "spring", tags: ["a", "b"] };

    const serialized = serializeQueryData<Shape>(data);

    expect(deserializeQueryData<Shape>(serialized)).toEqual(data);
  });

  test("round-trips non-ASCII values", () => {
    const data = { year: 2026, name: "Plzeň — jaro, kategorie žáků", tags: ["útok"] };

    const serialized = serializeQueryData<Shape>(data);

    expect(deserializeQueryData<Shape>(serialized)).toEqual(data);
  });

  test("produces a URL-safe string", () => {
    const serialized = serializeQueryData<Shape>({ year: 1, name: "a/b+c", tags: [] });

    expect(serialized).toBe(encodeURIComponent(decodeURIComponent(serialized)));
    expect(serialized).not.toMatch(/[/+=?&#]/);
  });
});
