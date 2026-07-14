export function hasInjection<T>(key: InjectionKey<T> | string) {
  return inject(key, undefined) !== undefined;
}

export function tryProvide<T, V>(key: InjectionKey<T> | string, valueFn: () => V) {
  if (hasInjectionContext() && !hasInjection(key)) {
    provide(key, valueFn());
    return true;
  }

  return false;
}
