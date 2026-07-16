import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import Button from "./button.vue";
import { buttonStyleVariants } from "./button.variants";

describe("buttonStyleVariants", () => {
  it("defaults to neutral glass at the default size", () => {
    const result = buttonStyleVariants({});

    expect(result).toContain("bg-white/60");
    expect(result).toContain("h-10");
    expect(result).toContain("backdrop-blur-md");
  });

  it.each([
    ["primary", "bg-primary-500/90"],
    ["success", "bg-success-600/90"],
    ["warning", "bg-warn-500/90"],
    ["danger", "bg-error-500/90"],
  ] as const)("fills the %s colour with tinted glass", (color, expected) => {
    expect(buttonStyleVariants({ color })).toContain(expected);
  });

  it("scopes colour fills to the default variant only", () => {
    const control = buttonStyleVariants({ variant: "control", color: "primary" });

    expect(control).not.toContain("bg-primary-500/90");
    expect(control).toContain("bg-white/70");
  });

  it("keeps icon sizes square", () => {
    const result = buttonStyleVariants({ size: "icon_sm" });

    expect(result).toContain("h-8");
    expect(result).toContain("w-8");
  });
});

describe("dButton", () => {
  it("renders a native button by default", () => {
    expect(mount(Button).element.tagName).toBe("BUTTON");
  });

  it("renders the element given by `as`", () => {
    expect(mount(Button, { props: { as: "a" } }).element.tagName).toBe("A");
  });

  it("renders slot content", () => {
    expect(mount(Button, { slots: { default: "Save" } }).text()).toBe("Save");
  });

  it("passes disabled through to the element", () => {
    expect(mount(Button, { props: { disabled: true } }).attributes("disabled")).toBeDefined();
  });

  it("passes the type attribute through", () => {
    expect(mount(Button, { props: { type: "submit" } }).attributes("type")).toBe("submit");
  });

  it("forwards unknown attributes", () => {
    expect(mount(Button, { attrs: { "aria-label": "Toggle sidebar" } }).attributes("aria-label")).toBe("Toggle sidebar");
  });
});
