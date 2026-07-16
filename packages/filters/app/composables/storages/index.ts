import type { FormGroup } from "#layers/director-forms/app/composables/useFormGroup";

import type { FilterOptions } from "../../types/filters";

import { useFiltersQueryObjectStorage, useFiltersQueryStorage } from "./query";

/** Wires the filter form to the storage backend selected in the options. */
export function useFiltersStorage<T>(filter: FormGroup<T>, options: FilterOptions<T>) {
  if (options.storage?.query) {
    useFiltersQueryStorage(filter, options.initializeTransform);
  }
  else if (options.storage?.queryObject) {
    useFiltersQueryObjectStorage(filter, options.storage);
  }
}
