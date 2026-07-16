import type { ComputedRef } from "vue";
import type { LocationQuery } from "vue-router";

import type { FormGroup } from "#layers/director-forms/app/composables/useFormGroup";
import type { InnerFormType } from "#layers/director-forms/app/types/innerFormTypes";
import type { PatchForm } from "#layers/director-forms/app/types/patching";

/**
 * Maps the raw route query onto a patch for the filter form — e.g. coercing the
 * string-typed query params back into numbers or arrays.
 */
export type FilterStorageQueryTransform<T> = (data: LocationQuery) => PatchForm<T>;

export interface FilterStorageOptions {
  /** Unique key for this filter set — the query param name in `queryObject` mode. */
  readonly id: string

  /** Mirror each filter field as its own query param. */
  readonly query?: boolean

  /** Serialize the whole filter object into a single query param named `id`. */
  readonly queryObject?: boolean

  /**
   * Remove the `queryObject` param from the URL when the owning component unmounts.
   *
   * @default true
   */
  readonly queryDestroy?: boolean
}

export interface FilterOptions<T> {
  readonly storage?: FilterStorageOptions

  /** Applied to the route query when initializing from `query` storage. */
  readonly initializeTransform?: FilterStorageQueryTransform<T>
}

/**
 * A filter is a form group over the filter controls plus a shortcut to its plain data —
 * the value pages feed into their queries.
 */
export interface Filters<T> {
  readonly form: FormGroup<T>
  readonly data: ComputedRef<InnerFormType<T>>
}

export type InferFiltersFields<T> = T extends Filters<infer U> ? U : never;
