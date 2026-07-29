/**
 * Permissions are plain strings here: the layer checks membership and walks
 * inheritance chains, but the actual permission vocabulary belongs to the app.
 * An app that wants literal-union safety can wrap `hasUserPermission` with its
 * own narrower type.
 */
export type IdentityPermission = string;

export interface EntityScopedPermissionCollection {
  permissions: IdentityPermission[]
  inheritsFrom?: EntityScopedPermissionCollection | undefined | null
}

export type HasUserPermissionArgument = {
  collection?: EntityScopedPermissionCollection
} & (
  { permission: IdentityPermission }
  | { permissions: Array<IdentityPermission> }
);
