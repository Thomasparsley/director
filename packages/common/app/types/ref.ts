export type MaybeRef<T, S = T> = T | Ref<T, S>;

export type GetRefType<T> = T extends Ref<infer V, unknown> ? V : T;
