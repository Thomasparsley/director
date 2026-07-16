import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";

import { useIsDirector } from "../composables/useDirector";
import AppShell from "./appShell.vue";

describe("dAppShell", () => {
  it("renders the default and left slots", () => {
    const wrapper = mount(AppShell, {
      slots: {
        default: "<p data-test=\"content\">page</p>",
        left: "<nav data-test=\"rail\">nav</nav>",
      },
    });

    expect(wrapper.find("[data-test=\"content\"]").exists()).toBe(true);
    expect(wrapper.find("[data-test=\"rail\"]").exists()).toBe(true);
  });

  it("renders the header bar only when a header slot is given", () => {
    expect(mount(AppShell).find("header").exists()).toBe(false);

    const withHeader = mount(AppShell, { slots: { header: "<span>crumbs</span>" } });

    expect(withHeader.find("header").exists()).toBe(true);
    expect(withHeader.find("header").text()).toBe("crumbs");
  });

  it("keeps the full rail width by default and narrows it when collapsed", () => {
    expect(mount(AppShell).html()).toContain("w-[250px]");

    const collapsed = mount(AppShell, { props: { collapsed: true } });

    expect(collapsed.html()).toContain("w-[76px]");
    expect(collapsed.html()).not.toContain("w-[250px]");
  });

  it("provides the director flag to slotted descendants", () => {
    const Probe = defineComponent({
      setup() {
        const isDirector = useIsDirector();
        return () => h("span", { "data-test": "probe" }, String(isDirector.value));
      },
    });

    const wrapper = mount(AppShell, { slots: { default: () => h(Probe) } });

    expect(wrapper.find("[data-test=\"probe\"]").text()).toBe("true");
  });
});
