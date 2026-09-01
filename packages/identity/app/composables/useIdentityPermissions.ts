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
 *
 * This composable's return IS the `permissions` group of the identity instance, so
 * the members are named for that seat: no `User` infix, because `permissions.` (or a
 * `useIdentity().permissions` destructure) already says it. They are also named to
 * read standalone — `hasPermission`, not the tempting `has` — because a component
 * has to destructure them: Vue unwraps only top-level refs from `<script setup>`, so
 * a `permissions.hasFullAccess` reaching a template would render the ref object
 * rather than the boolean.
 */
export function useIdentityPermissions(
  user: Readonly<Ref<IdentityUser | undefined>>,
  isAuthorized: Readonly<Ref<boolean>>,
) {
  const adapter = useIdentityRuntime().permissions;

  const hasFullAccess = computed(() => {
    const currentUser = user.value;
    if (!currentUser) {
      return false;
    }
    return adapter?.hasFullAccess?.(currentUser) ?? false;
  });

  function hasPermission(required: HasUserPermissionArgument): boolean {
    const currentUser = user.value;
    if (!isAuthorized.value || !currentUser) {
      return false;
    }
    if (hasFullAccess.value) {
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

  function useHasPermission(required: PermissionInput): ComputedRef<boolean> {
    return computed(() => hasPermission(toValue(required)));
  }

  return {
    hasFullAccess,
    hasPermission,
    useHasPermission,
  };
}
