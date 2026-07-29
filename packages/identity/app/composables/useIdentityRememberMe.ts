import { useLocalStorage } from "@vueuse/core";

/** Remembers the last login identifier so a re-login form can prefill it. */
export function useIdentityRememberMe() {
  return useLocalStorage<string | null>("remember-me-login", null);
}
