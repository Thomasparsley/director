import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { computed, defineComponent, h, nextTick, ref, type Ref } from "vue";
import type { Router } from "vue-router";

import { createTestRouter } from "../../test/mount";
import type { DNavigationItem, DNavigationSection } from "../types/navigation";
import { navigationItemValue, useNavigation, useNavigationActive } from "./useNavigation";

type NavigationApi = ReturnType<typeof useNavigation>;

/**
 * useNavigation provides/injects and reads the route, so it only works inside a mounted
 * component. This runs it in a throwaway host and hands back the live API.
 */
async function setupNavigation(
  sections: Array<DNavigationSection> | Ref<Array<DNavigationSection>>,
  path = "/",
): Promise<{ api: NavigationApi, router: Router }> {
  const router = await createTestRouter(path);

  let api!: NavigationApi;

  const Host = defineComponent({
    setup() {
      api = useNavigation(sections);
      return () => h("div");
    },
  });

  mount(Host, { global: { plugins: [router] } });
  await nextTick();

  return { api, router };
}

const item = (label: string, to?: string): DNavigationItem => ({ label, ...(to ? { to } : {}) });

const oneGroup = (items: Array<DNavigationItem>): Array<DNavigationSection> => [
  { key: "s", groups: [{ key: "g", items }] },
];

describe("navigationItemValue", () => {
  it("falls back to the label", () => {
    expect(navigationItemValue({ label: "Leagues" })).toBe("Leagues");
  });

  it("prefers an explicit value, so two items may share a label", () => {
    expect(navigationItemValue({ label: "Leagues", value: "fs-leagues" })).toBe("fs-leagues");
  });
});

describe("useNavigation — visibleSections", () => {
  it("keeps items that are not skipped", async () => {
    const { api } = await setupNavigation(oneGroup([item("A", "/a"), item("B", "/b")]));

    expect(api.visibleSections.value[0]?.groups?.[0]?.items).toHaveLength(2);
  });

  it("drops a section flagged skipIf", async () => {
    const { api } = await setupNavigation([
      { key: "s", skipIf: true, groups: [{ key: "g", items: [item("A", "/a")] }] },
    ]);

    expect(api.visibleSections.value).toHaveLength(0);
  });

  it("drops a group flagged skipIf", async () => {
    const { api } = await setupNavigation([
      {
        key: "s",
        groups: [
          { key: "hidden", skipIf: true, items: [item("A", "/a")] },
          { key: "shown", items: [item("B", "/b")] },
        ],
      },
    ]);

    expect(api.visibleSections.value[0]?.groups?.map(g => g.key)).toEqual(["shown"]);
  });

  it("drops an item flagged skipIf", async () => {
    const { api } = await setupNavigation(oneGroup([
      { label: "A", to: "/a", skipIf: true },
      { label: "B", to: "/b" },
    ]));

    expect(api.visibleSections.value[0]?.groups?.[0]?.items?.map(i => i.label)).toEqual(["B"]);
  });

  it("resolves skipIf given as a ref, and reacts when it flips", async () => {
    const hidden = ref(true);
    const { api } = await setupNavigation(oneGroup([
      { label: "A", to: "/a", skipIf: hidden },
      { label: "B", to: "/b" },
    ]));

    expect(api.visibleSections.value[0]?.groups?.[0]?.items?.map(i => i.label)).toEqual(["B"]);

    hidden.value = false;
    await nextTick();

    expect(api.visibleSections.value[0]?.groups?.[0]?.items?.map(i => i.label)).toEqual(["A", "B"]);
  });

  it("treats skipIf: false and an absent skipIf alike", async () => {
    const { api } = await setupNavigation(oneGroup([
      { label: "A", to: "/a", skipIf: false },
      { label: "B", to: "/b" },
    ]));

    expect(api.visibleSections.value[0]?.groups?.[0]?.items).toHaveLength(2);
  });

  it("filters skipped children without dropping their parent", async () => {
    const { api } = await setupNavigation(oneGroup([
      {
        label: "Parent",
        children: [
          { label: "Kept", to: "/kept" },
          { label: "Gone", to: "/gone", skipIf: true },
        ],
      },
    ]));

    const parent = api.visibleSections.value[0]?.groups?.[0]?.items?.[0];

    expect(parent?.children?.map(c => c.label)).toEqual(["Kept"]);
  });

  it("prunes a group whose items were all skipped, so no bare heading is left behind", async () => {
    const { api } = await setupNavigation([
      {
        key: "s",
        groups: [
          { key: "empty", label: "Empty", items: [{ label: "A", to: "/a", skipIf: true }] },
          { key: "kept", items: [item("B", "/b")] },
        ],
      },
    ]);

    expect(api.visibleSections.value[0]?.groups?.map(g => g.key)).toEqual(["kept"]);
  });

  it("prunes a section whose groups were all pruned", async () => {
    const { api } = await setupNavigation([
      { key: "s", groups: [{ key: "g", items: [{ label: "A", to: "/a", skipIf: true }] }] },
    ]);

    expect(api.visibleSections.value).toHaveLength(0);
  });

  it("survives a section with no groups and a group with no items", async () => {
    const { api } = await setupNavigation([
      { key: "no-groups" },
      { key: "s", groups: [{ key: "no-items" }] },
    ]);

    expect(api.visibleSections.value).toHaveLength(0);
  });

  it("handles an empty tree", async () => {
    const { api } = await setupNavigation([]);

    expect(api.visibleSections.value).toEqual([]);
  });

  it("tracks a reactive sections ref", async () => {
    const sections = ref(oneGroup([item("A", "/a")]));
    const { api } = await setupNavigation(sections);

    expect(api.visibleSections.value[0]?.groups?.[0]?.items).toHaveLength(1);

    sections.value = oneGroup([item("A", "/a"), item("B", "/b")]);
    await nextTick();

    expect(api.visibleSections.value[0]?.groups?.[0]?.items).toHaveLength(2);
  });
});

describe("useNavigation — activePath", () => {
  it("matches the current route exactly", async () => {
    const { api } = await setupNavigation(oneGroup([item("Clubs", "/clubs")]), "/clubs");

    expect(api.activePath.value).toBe("/clubs");
  });

  it("keeps a parent lit for a deeper route that has no entry of its own", async () => {
    const { api } = await setupNavigation(oneGroup([item("Clubs", "/clubs")]), "/clubs/42");

    expect(api.activePath.value).toBe("/clubs");
  });

  it("gives the longest match the win, so a shorter sibling does not stay lit", async () => {
    const { api } = await setupNavigation(
      oneGroup([item("All", "/leagues"), item("Mine", "/leagues/mine")]),
      "/leagues/mine",
    );

    expect(api.activePath.value).toBe("/leagues/mine");
  });

  it("is order-independent — the longest match wins even when it is declared first", async () => {
    const { api } = await setupNavigation(
      oneGroup([item("Mine", "/leagues/mine"), item("All", "/leagues")]),
      "/leagues/mine",
    );

    expect(api.activePath.value).toBe("/leagues/mine");
  });

  it("only matches the root link exactly, since '/' prefixes everything", async () => {
    const sections = oneGroup([item("Home", "/"), item("Clubs", "/clubs")]);

    expect((await setupNavigation(sections, "/")).api.activePath.value).toBe("/");
    expect((await setupNavigation(sections, "/clubs")).api.activePath.value).toBe("/clubs");
  });

  it("does not treat a shared path prefix as a match on a segment boundary", async () => {
    // /clubsdata must not light up /clubs.
    const { api } = await setupNavigation(oneGroup([item("Clubs", "/clubs")]), "/clubsdata");

    expect(api.activePath.value).toBeUndefined();
  });

  it("is undefined when nothing matches", async () => {
    const { api } = await setupNavigation(oneGroup([item("Clubs", "/clubs")]), "/elsewhere");

    expect(api.activePath.value).toBeUndefined();
  });

  it("ignores items that have no target", async () => {
    const { api } = await setupNavigation(oneGroup([item("Heading")]), "/");

    expect(api.activePath.value).toBeUndefined();
  });

  it("considers nested children, not just top-level items", async () => {
    const { api } = await setupNavigation(
      oneGroup([{ label: "Parent", children: [{ label: "Child", to: "/parent/child" }] }]),
      "/parent/child",
    );

    expect(api.activePath.value).toBe("/parent/child");
  });

  it("does not throw on a route target the app never registered", async () => {
    const { api } = await setupNavigation(
      oneGroup([{ label: "Ghost", to: { name: "does-not-exist" } }]),
      "/",
    );

    expect(() => api.activePath.value).not.toThrow();
    expect(api.activePath.value).toBeUndefined();
  });

  it("ignores items skipped out of the tree", async () => {
    const { api } = await setupNavigation(
      oneGroup([{ label: "Clubs", to: "/clubs", skipIf: true }]),
      "/clubs",
    );

    expect(api.activePath.value).toBeUndefined();
  });

  it("recomputes when the route changes", async () => {
    const { api, router } = await setupNavigation(
      oneGroup([item("A", "/a"), item("B", "/b")]),
      "/a",
    );

    expect(api.activePath.value).toBe("/a");

    await router.push("/b");
    await nextTick();

    expect(api.activePath.value).toBe("/b");
  });
});

describe("useNavigation — openValues", () => {
  it("keys each group as section:group", async () => {
    const { api } = await setupNavigation(oneGroup([item("A", "/a")]));

    expect(Object.keys(api.openValues.value)).toEqual(["s:g"]);
  });

  it("expands a branch flagged defaultOpen", async () => {
    const { api } = await setupNavigation(oneGroup([
      { label: "Parent", defaultOpen: true, children: [{ label: "Child", to: "/c" }] },
    ]));

    expect(api.openValues.value["s:g"]).toEqual(["Parent"]);
  });

  it("expands the branch that owns the current route", async () => {
    const { api } = await setupNavigation(
      oneGroup([
        { label: "Parent", children: [{ label: "Child", to: "/parent/child" }] },
        { label: "Other", children: [{ label: "Elsewhere", to: "/other" }] },
      ]),
      "/parent/child",
    );

    expect(api.openValues.value["s:g"]).toEqual(["Parent"]);
  });

  it("expands a branch whose grandchild owns the route", async () => {
    const { api } = await setupNavigation(
      oneGroup([
        {
          label: "Parent",
          children: [{ label: "Mid", children: [{ label: "Deep", to: "/deep" }] }],
        },
      ]),
      "/deep",
    );

    expect(api.openValues.value["s:g"]).toEqual(["Parent"]);
  });

  it("uses the item's value, not its label, as the accordion key", async () => {
    const { api } = await setupNavigation(oneGroup([
      { label: "Parent", value: "p1", defaultOpen: true, children: [{ label: "C", to: "/c" }] },
    ]));

    expect(api.openValues.value["s:g"]).toEqual(["p1"]);
  });

  it("expands nothing when no branch is open or active", async () => {
    const { api } = await setupNavigation(
      oneGroup([{ label: "Parent", children: [{ label: "Child", to: "/c" }] }]),
      "/unrelated",
    );

    expect(api.openValues.value["s:g"]).toEqual([]);
  });

  it("never lists a childless item", async () => {
    const { api } = await setupNavigation(oneGroup([item("Leaf", "/leaf")]), "/leaf");

    expect(api.openValues.value["s:g"]).toEqual([]);
  });

  it("re-expands the branch when the route moves into it", async () => {
    const { api, router } = await setupNavigation(
      oneGroup([{ label: "Parent", children: [{ label: "Child", to: "/parent/child" }] }]),
      "/",
    );

    expect(api.openValues.value["s:g"]).toEqual([]);

    await router.push("/parent/child");
    await nextTick();

    expect(api.openValues.value["s:g"]).toEqual(["Parent"]);
  });
});

describe("useNavigationActive", () => {
  it("reports nothing active when used outside a <DNavigation> provider", async () => {
    const router = await createTestRouter("/clubs");

    let active!: ReturnType<typeof useNavigationActive>;

    const Host = defineComponent({
      setup() {
        active = useNavigationActive();
        return () => h("div");
      },
    });

    mount(Host, { global: { plugins: [router] } });

    // No provider means no winner was published — the entry must not guess for itself.
    expect(active.isItemActive({ label: "Clubs", to: "/clubs" })).toBe(false);
    expect(active.hasActiveDescendant({ label: "P", children: [{ label: "C", to: "/clubs" }] })).toBe(false);
  });

  it("matches an item against the provided winner, and detects it among descendants", async () => {
    const router = await createTestRouter("/deep");

    let active!: ReturnType<typeof useNavigationActive>;

    const Child = defineComponent({
      setup() {
        active = useNavigationActive();
        return () => h("div");
      },
    });

    // Mirrors what <DNavigation> publishes.
    const Parent = defineComponent({
      components: { Child },
      setup() {
        useNavigation(oneGroup([
          { label: "Parent", children: [{ label: "Deep", to: "/deep" }] },
        ]));

        return () => h(Child);
      },
    });

    mount(Parent, { global: { plugins: [router] } });
    await nextTick();

    expect(active.isItemActive({ label: "Deep", to: "/deep" })).toBe(true);
    expect(active.isItemActive({ label: "Other", to: "/other" })).toBe(false);
    expect(active.isItemActive({ label: "No target" })).toBe(false);
    expect(active.hasActiveDescendant({
      label: "Parent",
      children: [{ label: "Deep", to: "/deep" }],
    })).toBe(true);
    expect(active.hasActiveDescendant({ label: "Leaf", to: "/deep" })).toBe(false);
  });
});

describe("useNavigation — items shorthand parity", () => {
  it("computes the same active path however the tree is shaped", async () => {
    const nested = await setupNavigation(
      [{ key: "a", groups: [{ key: "b", items: [item("Clubs", "/clubs")] }] }],
      "/clubs",
    );
    const flat = await setupNavigation(oneGroup([item("Clubs", "/clubs")]), "/clubs");

    expect(nested.api.activePath.value).toBe(flat.api.activePath.value);
  });

  it("exposes activePath as a computed that stays in sync", async () => {
    const { api, router } = await setupNavigation(oneGroup([item("A", "/a")]), "/");
    const mirror = computed(() => api.activePath.value ?? "none");

    expect(mirror.value).toBe("none");

    await router.push("/a");
    await nextTick();

    expect(mirror.value).toBe("/a");
  });
});
