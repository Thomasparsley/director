import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import Kbd from "./kbd.vue";
import { resolveKbdKey } from "./kbd.keys";
import { kbdStyleVariants } from "./kbd.variants";

const MAC_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
const WINDOWS_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

/** Mounts a cap and lets the post-hydration platform check land. */
async function mountKbd(userAgent: string, value: string) {
  vi.stubGlobal("navigator", { userAgent });

  const wrapper = mount(Kbd, { props: { value } });
  await nextTick();

  return wrapper;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveKbdKey", () => {
  it.each([
    ["meta", "⌘", "Ctrl"],
    ["ctrl", "⌃", "Ctrl"],
    ["alt", "⌥", "Alt"],
    ["shift", "⇧", "Shift"],
    ["enter", "↵", "Enter"],
  ])("renders %s per platform", (key, mac, other) => {
    expect(resolveKbdKey(key, true)).toBe(mac);
    expect(resolveKbdKey(key, false)).toBe(other);
  });

  it("keeps the Mac glyph for keys named after it explicitly", () => {
    expect(resolveKbdKey("command", false)).toBe("⌘");
    expect(resolveKbdKey("option", false)).toBe("⌥");
  });

  it("passes unknown keys through untouched", () => {
    expect(resolveKbdKey("K", true)).toBe("K");
    expect(resolveKbdKey("F5", false)).toBe("F5");
  });

  it("matches key names regardless of case", () => {
    expect(resolveKbdKey("Shift", true)).toBe("⇧");
    expect(resolveKbdKey("ArrowUp", false)).toBe("↑");
  });

  it("resolves nothing when there is no value", () => {
    expect(resolveKbdKey(undefined, true)).toBeUndefined();
  });
});

describe("kbdStyleVariants", () => {
  it("defaults to a raised cap at the medium size", () => {
    const result = kbdStyleVariants({});

    expect(result).toContain("bg-white/70");
    expect(result).toContain("h-5");
    expect(result).toContain("min-w-5");
  });

  it("keeps a single glyph square by matching min-width to height", () => {
    expect(kbdStyleVariants({ size: "lg" })).toContain("h-6 min-w-6");
  });

  it("drops the pressable shadow for the flat variants", () => {
    expect(kbdStyleVariants({ variant: "subtle" })).not.toContain("inset_0_1px_0_rgba(255,255,255,0.8)");
    expect(kbdStyleVariants({ variant: "outline" })).not.toContain("inset_0_1px_0_rgba(255,255,255,0.8)");
  });
});

describe("dKbd", () => {
  it("renders a real kbd element", () => {
    expect(mount(Kbd, { props: { value: "K" } }).element.tagName).toBe("KBD");
  });

  it("shows the command glyph on a Mac", async () => {
    expect((await mountKbd(MAC_USER_AGENT, "meta")).text()).toBe("⌘");
  });

  it("spells the same key out on Windows", async () => {
    expect((await mountKbd(WINDOWS_USER_AGENT, "meta")).text()).toBe("Ctrl");
  });

  it("renders the non-Mac label before mount, so hydration matches the server", () => {
    vi.stubGlobal("navigator", { userAgent: MAC_USER_AGENT });

    // The first render can't know the platform — only the tick after mount does.
    expect(mount(Kbd, { props: { value: "meta" } }).text()).toBe("Ctrl");
  });

  it("lets the slot win over the value", () => {
    const wrapper = mount(Kbd, { props: { value: "meta" }, slots: { default: "Fn" } });

    expect(wrapper.text()).toBe("Fn");
  });
});
