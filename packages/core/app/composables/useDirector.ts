import { computed, inject, provide } from "vue";

const provideKey = "isDirector";

export function useProvideIsDirector() {
  provide<boolean>(provideKey, true);
}

export function useIsDirector() {
  const isDirector = inject<boolean>(provideKey, false);
  return computed(() => isDirector);
}
