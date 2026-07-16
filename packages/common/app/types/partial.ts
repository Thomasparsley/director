/**
 * Recursively makes all properties of `T` optional. Functions are kept as-is,
 * arrays keep their length but their items become deeply partial.
 */
export type DeepPartial<T>
  = T extends Function
    ? T
    : T extends Array<infer U>
      ? Array<DeepPartial<U>>
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T;
