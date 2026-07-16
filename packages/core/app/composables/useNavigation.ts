import {
  computed,
  inject,
  provide,
  unref,
  type ComputedRef,
  type InjectionKey,
  type MaybeRef,
} from "vue";
import { useRoute, useRouter, type RouteLocationRaw } from "vue-router";

import type {
  DNavigationGroup,
  DNavigationItem,
  DNavigationSection,
  NavigationCondition,
} from "../types/navigation";

/**
 * The resolved path of the one item that owns the current route. Published by `<DNavigation>`
 * and consumed by every entry, so nested entries can resolve their own state without the tree
 * being threaded down through props.
 */
const NAVIGATION_ACTIVE_PATH: InjectionKey<ComputedRef<string | undefined>> = Symbol("d-navigation-active-path");

/** `skipIf` accepts a plain boolean or a `Ref<boolean>` (e.g. a computed permission check). */
function isSkipped(skipIf: NavigationCondition | undefined): boolean {
  return unref(skipIf) === true;
}

/** Accordion identity for an item. Stable across re-renders as long as the label is. */
export function navigationItemValue(item: DNavigationItem): string {
  return item.value ?? item.label;
}

function flattenItems(items: Array<DNavigationItem> = []): Array<DNavigationItem> {
  return items.flatMap(item => [item, ...flattenItems(item.children)]);
}

function useResolvePath() {
  const router = useRouter();

  return (to: RouteLocationRaw): string | undefined => {
    try {
      return router.resolve(to).path;
    }
    catch {
      // An unresolvable target (e.g. a named route the app hasn't registered) must not take
      // the whole sidebar down with it.
      return undefined;
    }
  };
}

function makeMatchers(
  activePath: ComputedRef<string | undefined>,
  resolvePath: (to: RouteLocationRaw) => string | undefined,
) {
  function isItemActive(item: DNavigationItem): boolean {
    if (!item.to || !activePath.value) {
      return false;
    }

    return resolvePath(item.to) === activePath.value;
  }

  function hasActiveDescendant(item: DNavigationItem): boolean {
    return flattenItems(item.children).some(isItemActive);
  }

  return { isItemActive, hasActiveDescendant };
}

/**
 * Route-matching half of the navigation, for a single entry.
 *
 * Active state is decided by `<DNavigation>` rather than per item, because "does this path
 * match the route?" cannot be answered in isolation: on `/leagues/mine`, a prefix match makes
 * both `/leagues` and `/leagues/mine` look active. Only the longest match wins, and that needs
 * the whole tree — so entries just compare against the winner.
 */
export function useNavigationActive() {
  return makeMatchers(
    inject(NAVIGATION_ACTIVE_PATH, computed(() => undefined)),
    useResolvePath(),
  );
}

export function useNavigation(sections: MaybeRef<Array<DNavigationSection>>) {
  const route = useRoute();
  const resolvePath = useResolvePath();

  /** Drops skipped sections / groups / items (recursively) so the template stays flat. */
  const visibleSections = computed<Array<DNavigationSection>>(() => {
    const filterItems = (items: Array<DNavigationItem> = []): Array<DNavigationItem> => items
      .filter(item => !isSkipped(item.skipIf))
      .map(item => (item.children
        ? { ...item, children: filterItems(item.children) }
        : item));

    const filterGroups = (groups: Array<DNavigationGroup> = []): Array<DNavigationGroup> => groups
      .filter(group => !isSkipped(group.skipIf))
      .map(group => ({ ...group, items: filterItems(group.items) }))
      // A group whose items were all skipped would otherwise render as a bare heading.
      .filter(group => (group.items?.length ?? 0) > 0);

    return unref(sections)
      .filter(section => !isSkipped(section.skipIf))
      .map(section => ({ ...section, groups: filterGroups(section.groups) }))
      .filter(section => (section.groups?.length ?? 0) > 0);
  });

  /**
   * The single item that owns the current route: the longest path that the route sits under.
   * Prefix matching is what lets `/users/42` (a detail page with no nav entry of its own) keep
   * `/users` lit — but the *longest* match wins, so a sibling like `/leagues` does not stay lit
   * while you are on `/leagues/mine`.
   */
  const activePath = computed<string | undefined>(() => {
    let best: string | undefined;

    for (const section of visibleSections.value) {
      for (const group of section.groups ?? []) {
        for (const item of flattenItems(group.items)) {
          if (!item.to) {
            continue;
          }

          const path = resolvePath(item.to);
          if (!path) {
            continue;
          }

          // "/" prefix-matches every route, so the root link only ever matches exactly.
          const matches = path === "/"
            ? route.path === "/"
            : route.path === path || route.path.startsWith(`${path}/`);

          if (matches && (best === undefined || path.length > best.length)) {
            best = path;
          }
        }
      }
    }

    return best;
  });

  provide(NAVIGATION_ACTIVE_PATH, activePath);

  // Built from `activePath` directly, not via useNavigationActive(): `inject` reads the parent
  // chain, so a component never sees what it just provided itself.
  const { hasActiveDescendant } = makeMatchers(activePath, resolvePath);

  /**
   * Accordion values to expand, keyed by group: anything flagged `defaultOpen`, plus every
   * parent of the active route — so a deep link or a back-button hit re-opens the branch the
   * user is actually in.
   */
  const openValues = computed<Record<string, Array<string>>>(() => {
    const result: Record<string, Array<string>> = {};

    for (const section of visibleSections.value) {
      for (const group of section.groups ?? []) {
        result[`${section.key}:${group.key}`] = (group.items ?? [])
          .filter(item => (item.children?.length ?? 0) > 0)
          .filter(item => item.defaultOpen === true || hasActiveDescendant(item))
          .map(navigationItemValue);
      }
    }

    return result;
  });

  return {
    visibleSections,
    openValues,
    activePath,
  };
}
