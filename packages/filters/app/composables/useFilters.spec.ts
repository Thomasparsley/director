import { mount } from "@vue/test-utils";
import { describe, expect, test, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";

import { useFormControl } from "#layers/director-forms/app/composables/useFormControl";
import { numberEnsureTransformer } from "#layers/director-forms/app/transformers";

import type { FilterOptions } from "../types/filters";
import { serializeQueryData } from "../utils/query";

import { useFilters } from "./useFilters";

function makeControls() {
  return {
    year: useFormControl<number>(2026, { transformers: [numberEnsureTransformer] }),
    name: useFormControl(""),
  };
}

type Controls = ReturnType<typeof makeControls>;
type FilterApi = ReturnType<typeof useFilters<Controls>>;

async function createTestRouter(path = "/"): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", name: "catchAll", component: { template: "<div />" } }],
  });

  await router.push(path);
  await router.isReady();

  return router;
}

/**
 * The storages read the route and register lifecycle hooks, so useFilters runs
 * inside a throwaway host component; the test drives the live API it hands back.
 *
 * The host sits behind a v-if so `hideHost()` unmounts it the way navigating away
 * from a page does. Unmounting the whole app instead would reset vue-router to
 * START_LOCATION before the teardown hooks run, which no real page ever sees.
 */
async function setupFilters(
  options: FilterOptions<Controls>,
  path = "/",
): Promise<{ api: FilterApi, controls: Controls, router: Router, hideHost: () => Promise<void> }> {
  const router = await createTestRouter(path);

  let api!: FilterApi;
  let controls!: Controls;

  const Host = defineComponent({
    setup() {
      controls = makeControls();
      api = useFilters(controls, options);
      return () => h("div");
    },
  });

  const showHost = ref(true);
  const Parent = defineComponent({
    setup() {
      return () => (showHost.value ? h(Host) : h("div"));
    },
  });

  mount(Parent, { global: { plugins: [router] } });
  await nextTick();

  async function hideHost() {
    showHost.value = false;
    await nextTick();
  }

  return { api, controls, router, hideHost };
}

describe("useFilters", () => {
  test("returns the form group and its data", () => {
    const filter = useFilters(makeControls());

    expect(filter.data.value).toEqual({ year: 2026, name: "" });
    expect(filter.form.isPristine.value).toBe(true);
  });
});

describe("useFilters — query storage", () => {
  const storage: FilterOptions<Controls> = { storage: { id: "test", query: true } };

  test("initializes from the route query, keeping the form pristine", async () => {
    const { api } = await setupFilters(
      {
        ...storage,
        initializeTransform: query => ({ name: query.name as string }),
      },
      "/?name=spring",
    );

    expect(api.data.value.name).toBe("spring");
    expect(api.form.isPristine.value).toBe(true);
  });

  test("writes changed fields back to the query", async () => {
    const { controls, router } = await setupFilters(storage);

    controls.year.data.value = 2027;

    await vi.waitFor(() => {
      expect(router.currentRoute.value.query.year).toBe("2027");
    });
  });

  test("preserves unrelated query params when writing", async () => {
    const { controls, router } = await setupFilters(storage, "/?tab=results");

    controls.name.data.value = "autumn";

    await vi.waitFor(() => {
      expect(router.currentRoute.value.query).toMatchObject({ tab: "results", name: "autumn" });
    });
  });
});

describe("useFilters — queryObject storage", () => {
  const storage: FilterOptions<Controls> = { storage: { id: "flt", queryObject: true } };

  test("initializes from the serialized query param, keeping the form pristine", async () => {
    const value = serializeQueryData<Controls>({ year: 1999, name: "loaded" });
    const { api } = await setupFilters(storage, `/?flt=${value}`);

    expect(api.data.value).toEqual({ year: 1999, name: "loaded" });
    expect(api.form.isPristine.value).toBe(true);
  });

  test("writes the whole filter object under its id on change", async () => {
    const { controls, router } = await setupFilters(storage);

    controls.name.data.value = "changed";

    await vi.waitFor(() => {
      expect(router.currentRoute.value.query.flt).toBe(
        serializeQueryData<Controls>({ year: 2026, name: "changed" }),
      );
    });
  });

  test("clears its query param on unmount by default", async () => {
    const value = serializeQueryData<Controls>({ year: 1999, name: "loaded" });
    const { router, hideHost } = await setupFilters(storage, `/?flt=${value}&tab=results`);

    await hideHost();

    await vi.waitFor(() => {
      expect(router.currentRoute.value.query.flt).toBeUndefined();
      expect(router.currentRoute.value.query.tab).toBe("results");
    });
  });

  test("keeps its query param on unmount when queryDestroy is false", async () => {
    const value = serializeQueryData<Controls>({ year: 1999, name: "loaded" });
    const { router, hideHost } = await setupFilters(
      { storage: { id: "flt", queryObject: true, queryDestroy: false } },
      `/?flt=${value}`,
    );

    // The immediate watcher re-serializes the loaded data back into the param on mount.
    await vi.waitFor(() => {
      expect(router.currentRoute.value.query.flt).toBe(value);
    });

    await hideHost();
    await nextTick();

    expect(router.currentRoute.value.query.flt).toBe(value);
  });
});
