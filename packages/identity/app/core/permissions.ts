import type { HasUserPermissionArgument, IdentityPermission } from "../types/permissions";

interface PermissionScope<TSelf> {
  permissions: readonly IdentityPermission[]
  inheritsFrom?: TSelf | null
}

/**
 * Does the available permission list satisfy the requirement?
 * Handles both single-permission and any-of-array requirements.
 */
export function permissionsSatisfy(
  available: readonly IdentityPermission[],
  required: HasUserPermissionArgument,
): boolean {
  if ("permissions" in required) {
    return available.some(p => required.permissions.includes(p));
  }
  return available.includes(required.permission);
}

/**
 * Walks up a scope's `inheritsFrom` chain, returning true as soon as
 * any node in the chain satisfies the requirement.
 */
export function scopeChainSatisfies<T extends PermissionScope<T>>(
  scope: T | null | undefined,
  required: HasUserPermissionArgument,
): boolean {
  let current: T | null | undefined = scope;
  while (current) {
    if (permissionsSatisfy(current.permissions, required)) {
      return true;
    }
    current = current.inheritsFrom;
  }
  return false;
}
