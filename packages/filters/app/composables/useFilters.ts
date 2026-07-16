import { useFormGroup } from "#layers/director-forms/app/composables/useFormGroup";

import type { FilterOptions, Filters } from "../types/filters";

import { useFiltersStorage } from "./storages";

/**
 * Builds a filter form from a record of form controls and optionally persists it
 * to the URL query (`storage.query` per-field, or `storage.queryObject` as one
 * serialized param). Must run inside component setup when storage is enabled.
 */
export function useFilters<T>(filter: T, options?: FilterOptions<T>): Filters<T> {
  const form = useFormGroup(filter);

  if (options?.storage) {
    useFiltersStorage(form, options);
  }

  return {
    form,
    data: form.data,
  };
}
