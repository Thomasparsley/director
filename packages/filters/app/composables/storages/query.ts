import { onBeforeUnmount, onMounted, type WatchStopHandle } from "vue";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";

import { watchThrottled } from "@vueuse/core";

import { makeDeepDiff } from "#layers/director-common/app/utils/makeDeepDiff";
import type { FormGroup } from "#layers/director-forms/app/composables/useFormGroup";
import type { PatchForm } from "#layers/director-forms/app/types/patching";

import type { FilterStorageOptions, FilterStorageQueryTransform } from "../../types/filters";
import { deserializeQueryData, serializeQueryData } from "../../utils/query";

/**
 * Mirrors each filter field as its own query param: initializes the form from the
 * current query, then writes changed fields back to the URL as the user filters.
 */
export function useFiltersQueryStorage<T>(
  filter: FormGroup<T>,
  transform: FilterStorageQueryTransform<T> = v => v as PatchForm<T>,
) {
  const route = useRoute();
  const router = useRouter();
  const data = filter.data;

  // Load data from query and update form
  {
    const query = transform(route.query);
    filter.patch(query, { write: true });
  }

  // Registered on mount so the URL is only ever written on the client.
  onMounted(() => {
    watchThrottled(
      data,
      async (newData, oldData) => {
        const diff = makeDeepDiff(
          oldData as Record<string, unknown>,
          newData as Record<string, unknown>,
        );
        const updatedQuery = { ...route.query, ...diff as LocationQueryRaw };
        await router.replace({ query: updatedQuery });
      },
      { throttle: 500 },
    );
  });
}

/**
 * Persists the whole filter object as a single serialized query param named by
 * `options.id`; by default the param is removed again when the component unmounts.
 */
export function useFiltersQueryObjectStorage<T>(
  filter: FormGroup<T>,
  options: Pick<FilterStorageOptions, "id" | "queryDestroy">,
) {
  const route = useRoute();
  const router = useRouter();
  const data = filter.data;
  let wasQueryValuePresent = false;

  // Load data from query and update form
  {
    const query = route.query;
    const queryValue = query[options.id] as string | null | undefined;
    if (queryValue) {
      wasQueryValuePresent = true;
      const parsedValue = deserializeQueryData<T>(queryValue);
      filter.patch(parsedValue, { write: true });
    }
  }

  let cancelWatchData: WatchStopHandle | undefined;
  onMounted(() => {
    cancelWatchData = watchThrottled(
      data,
      async (newData) => {
        const updatedQuery = { ...route.query, [options.id]: serializeQueryData<T>(newData) };
        await router.replace({ query: updatedQuery });
      },
      { immediate: wasQueryValuePresent, throttle: 500 },
    );
  });

  onBeforeUnmount(async () => {
    cancelWatchData?.();

    if (options.queryDestroy ?? true) {
      // Clear from query when unmounted
      const updatedQuery = { ...route.query, [options.id]: undefined };
      await router.replace({ query: updatedQuery });
    }
  });
}
