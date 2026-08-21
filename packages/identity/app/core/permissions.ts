import type { HasUserPermissionArgument, IdentityPermission } from "../types/permissions";

// Deliberately *not* generic over "the same type as me". A GraphQL fragment spells the chain out to
// a fixed depth — `permissions { permissions, inheritsFrom { permissions } }` — so the inner node is
// a narrower type than the outer one and a `T extends PermissionScope<T>` constraint rejects the very
// shape the server sends. Recursing through the interface itself accepts any depth, complete or cut short.
interface PermissionScope {
  permissions: readonly IdentityPermission[]
  inheritsFrom?: PermissionScope | null
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
export function scopeChainSatisfies(
  scope: PermissionScope | null | undefined,
  required: HasUserPermissionArgument,
): boolean {
  let current: PermissionScope | null | undefined = scope;
  while (current) {
    if (permissionsSatisfy(current.permissions, required)) {
      return true;
    }
    current = current.inheritsFrom;
  }
  return false;
}

/**
 * Does the reader hold *any* grant on this scope, directly or by inheritance?
 *
 * A backend that answers a scoped-permission query with a derived row — one that carries no
 * permissions of its own and hangs the real grant off `inheritsFrom` — makes reading only
 * `scope.permissions` report "no grant at all" for someone who in fact owns the parent. Anything
 * asking the coarse "may this reader be here?" question walks the chain instead.
 */
export function scopeChainHasAnyPermission(
  scope: PermissionScope | null | undefined,
): boolean {
  let current: PermissionScope | null | undefined = scope;
  while (current) {
    if (current.permissions.length) {
      return true;
    }
    current = current.inheritsFrom;
  }
  return false;
}
