export interface DSkeletonProps {
  /**
   * Width range in rem — each instance randomizes inside it after mount, so stacked rows
   * shimmer unevenly. SSR renders the lower bound to keep hydration deterministic.
   */
  readonly rw?: [number, number]
}
