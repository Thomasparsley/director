import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import Skeleton from "./skeleton.vue";

describe("dSkeleton", () => {
  it("renders without a width when no range is given", () => {
    expect((mount(Skeleton).element as HTMLElement).style.width).toBe("");
  });

  it("picks a width inside the given rem range", () => {
    const { width } = (mount(Skeleton, { props: { rw: [4, 6] } }).element as HTMLElement).style;
    const value = Number.parseFloat(width);

    expect(width.endsWith("rem")).toBe(true);
    expect(value).toBeGreaterThanOrEqual(4);
    expect(value).toBeLessThanOrEqual(6);
  });

  it("collapses a degenerate range to its single value", () => {
    expect((mount(Skeleton, { props: { rw: [3, 3] } }).element as HTMLElement).style.width).toBe("3rem");
  });

  it("pulses", () => {
    expect(mount(Skeleton).classes().join(" ")).toContain("animate-pulse");
  });
});
