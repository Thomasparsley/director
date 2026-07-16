import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";

import DBadge from "../../ui/app/components/badge.vue";
import DChip from "../../ui/app/components/chip.vue";
import DNavigation from "../app/components/navigation.vue";
import DNavigationEntry from "../app/components/navigationEntry.vue";
import DNavigationEntryBody from "../app/components/navigationEntryBody.vue";
import type { DNavigationProps } from "../app/components/navigation.types";

/** Stands in for the auto-imported lucide chevron. */
export const IconChevronRight = defineComponent({
  name: "IconChevronRight",
  setup: () => () => h("svg", { "data-test": "chevron" }),
});

/** Everything Nuxt would auto-import for these components. */
export const globalComponents = {
  DNavigationEntry,
  DNavigationEntryBody,
  DBadge,
  DChip,
  IconChevronRight,
};

export async function createTestRouter(path = "/"): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    // A catch-all keeps every `to` in the fixtures resolvable, so router.resolve() returns the
    // path rather than warning about an unmatched route.
    routes: [{ path: "/:pathMatch(.*)*", name: "catchAll", component: { template: "<div />" } }],
  });

  await router.push(path);
  await router.isReady();

  return router;
}

interface MountNavigationOptions {
  readonly path?: string
  readonly slots?: Record<string, string>
}

export async function mountNavigation(
  props: DNavigationProps,
  options: MountNavigationOptions = {},
): Promise<{ wrapper: VueWrapper, router: Router }> {
  const router = await createTestRouter(options.path ?? "/");

  const wrapper = mount(DNavigation, {
    props,
    slots: options.slots,
    // Popovers and tooltips teleport to <body>; without attaching, that content is unreachable.
    attachTo: document.body,
    global: {
      plugins: [router],
      components: globalComponents,
    },
  });

  await nextTick();

  return { wrapper, router };
}
