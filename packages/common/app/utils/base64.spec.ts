import { describe, expect, it } from "vitest";
import { base64ToUtf8, utf8ToBase64 } from "./base64";

// Strings exercising ASCII, multibyte UTF-8, combining marks and surrogate pairs.
const samples = {
  empty: "",
  ascii: "Hello, World!",
  whitespace: " \t\n\r ",
  czech: "Příliš žluťoučký kůň úpěl ďábelské ódy",
  emoji: "😀👍🏽🇨🇿",
  cjk: "你好，世界",
  combining: "é", // "e" + combining acute accent
  mixed: "abc 123 — café 🚀 日本語",
} as const;

describe("utf8ToBase64", () => {
  it("encodes ASCII to base64", () => {
    expect(utf8ToBase64("Hello, World!")).toBe("SGVsbG8sIFdvcmxkIQ==");
  });

  it("encodes an empty string to an empty string", () => {
    expect(utf8ToBase64("")).toBe("");
  });

  it("encodes a multibyte emoji using its UTF-8 bytes", () => {
    expect(utf8ToBase64("😀")).toBe("8J+YgA==");
  });

  it("matches Node's Buffer base64 encoding for each sample", () => {
    for (const value of Object.values(samples)) {
      expect(utf8ToBase64(value)).toBe(Buffer.from(value, "utf8").toString("base64"));
    }
  });
});

describe("base64ToUtf8", () => {
  it("decodes base64 back to ASCII", () => {
    expect(base64ToUtf8("SGVsbG8sIFdvcmxkIQ==")).toBe("Hello, World!");
  });

  it("decodes an empty string to an empty string", () => {
    expect(base64ToUtf8("")).toBe("");
  });

  it("decodes multibyte UTF-8 bytes into the original characters", () => {
    expect(base64ToUtf8("8J+YgA==")).toBe("😀");
  });

  it("matches Node's Buffer base64 decoding for each sample", () => {
    for (const value of Object.values(samples)) {
      const encoded = Buffer.from(value, "utf8").toString("base64");
      expect(base64ToUtf8(encoded)).toBe(value);
    }
  });
});

describe("base64ToUtf8 error paths", () => {
  it("throws on characters outside the base64 alphabet", () => {
    expect(() => base64ToUtf8("@@@@")).toThrow();
  });

  it("throws on input whose length is not a valid base64 encoding", () => {
    expect(() => base64ToUtf8("a")).toThrow();
  });

  it("tolerates surrounding/inner whitespace (stripped by atob)", () => {
    expect(base64ToUtf8(" SGVsbG8= ")).toBe("Hello");
    expect(base64ToUtf8("SGVs bG8=")).toBe("Hello");
  });
});

describe("round trip", () => {
  for (const [name, value] of Object.entries(samples)) {
    it(`preserves the "${name}" sample through encode → decode`, () => {
      expect(base64ToUtf8(utf8ToBase64(value))).toBe(value);
    });
  }
});
