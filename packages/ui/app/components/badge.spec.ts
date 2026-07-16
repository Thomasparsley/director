import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import Badge from "./badge.vue";
import { badgeStyleVariants } from "./badge.variants";

describe("badgeStyleVariants", () => {
  it("applies the neutral / xs / default combination when nothing is passed", () => {
    const result = badgeStyleVariants({});

    expect(result).toContain("bg-black/6");
    expect(result).toContain("text-xs");
  });

  it("treats an explicitly undefined variant as unset rather than as a missing key", () => {
    expect(badgeStyleVariants({ color: undefined })).toBe(badgeStyleVariants({}));
  });

  it("adds the inset ring only for the subtle variant", () => {
    expect(badgeStyleVariants({ variant: "subtle", color: "error" })).toContain("ring-error-400/30");
    expect(badgeStyleVariants({ variant: "default", color: "error" })).not.toContain("ring-error-400/30");
  });

  it.each([
    ["primary", "bg-primary-500/15"],
    ["neutral", "bg-black/6"],
    ["info", "bg-info-500/15"],
    ["success", "bg-success-500/15"],
    ["warn", "bg-warn-500/15"],
    ["error", "bg-error-500/15"],
  ] as const)("maps the %s colour onto a translucent tint", (color, expected) => {
    expect(badgeStyleVariants({ color })).toContain(expected);
  });
});

describe("dBadge", () => {
  it("renders the label prop", () => {
    const wrapper = mount(Badge, { props: { label: "12" } });

    expect(wrapper.text()).toBe("12");
  });

  it("renders a numeric label, including zero", () => {
    expect(mount(Badge, { props: { label: 0 } }).text()).toBe("0");
  });

  it("prefers the default slot over the label prop", () => {
    const wrapper = mount(Badge, {
      props: { label: "ignored" },
      slots: { default: "from-slot" },
    });

    expect(wrapper.text()).toBe("from-slot");
    expect(wrapper.text()).not.toContain("ignored");
  });

  it("renders nothing in the content span when neither slot nor label is given", () => {
    expect(mount(Badge).text()).toBe("");
  });

  it("renders the leading and trailing slots around the content", () => {
    const wrapper = mount(Badge, {
      props: { label: "mid" },
      slots: { leading: "<i>L</i>", trailing: "<i>T</i>" },
    });

    expect(wrapper.text()).toBe("LmidT");
  });

  it("reflects colour and size props in the class list", () => {
    const wrapper = mount(Badge, { props: { color: "success", size: "sm" } });

    expect(wrapper.classes().join(" ")).toContain("bg-success-500/15");
    expect(wrapper.classes().join(" ")).toContain("text-sm");
  });
});
