import type { ComputedGetter, ComputedRef, Ref } from "vue";
import { computed, toValue } from "vue";

import { permissionsSatisfy, scopeChainSatisfies } from "../core/permissions";
import type { HasUserPermissionArgument } from "../types/permissions";
import type { IdentityUser } from "../types/user";

import { useIdentityRuntime } from "./useIdentityRuntime";

type PermissionInput
  = | HasUserPermissionArgument
    | ComputedGetter<HasUserPermissionArgument>
    | Readonly<Ref<HasUserPermissionArgument>>;

/**
 * Permission checks over the app's user shape. The layer never assumes where a
 * user's permissions live — the app teaches it via the `identity.permissions`
 * adapter in app.config (`hasFullAccess` / `permissionsOf`). Without an adapter,
 * only the explicit scope-chain path (`required.collection`) can grant access.
 */
export function useIdentityPermissions(
  user: Readonly<Ref<IdentityUser | undefined>>,
  isAuthorized: Readonly<Ref<boolean>>,
) {
  const adapter = useIdentityRuntime().permissions;

  const hasUserFullAccess = computed(() => {
    const currentUser = user.value;
    if (!currentUser) {
      return false;
    }
    return adapter?.hasFullAccess?.(currentUser) ?? false;
  });

  function hasUserPermission(required: HasUserPermissionArgument): boolean {
    const currentUser = user.value;
    if (!isAuthorized.value || !currentUser) {
      return false;
    }
    if (hasUserFullAccess.value) {
      return true;
    }

    const scope = toValue(required.collection);
    if (scope) {
      return scopeChainSatisfies(scope, required);
    }

    const userPermissions = adapter?.permissionsOf?.(currentUser);
    if (!userPermissions) {
      return false;
    }
    return permissionsSatisfy(userPermissions, required);
  }

  function useHasUserPermission(required: PermissionInput): ComputedRef<boolean> {
    return computed(() => hasUserPermission(toValue(required)));
  }

  return {
    hasUserFullAccess,
    hasUserPermission,
    useHasUserPermission,
  };
}
