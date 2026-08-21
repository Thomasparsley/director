import { describe, expect, it } from "vitest";

import type { EntityScopedPermissionCollection } from "../types/permissions";

import { permissionsSatisfy, scopeChainHasAnyPermission, scopeChainSatisfies } from "./permissions";

describe("permissionsSatisfy", () => {
  it("matches a single required permission present in the list", () => {
    expect(permissionsSatisfy(["LEAGUE_OWNER"], { permission: "LEAGUE_OWNER" })).toBe(true);
  });

  it("rejects a single required permission absent from the list", () => {
    expect(permissionsSatisfy(["EVENT_OWNER"], { permission: "LEAGUE_OWNER" })).toBe(false);
  });

  it("matches an any-of requirement when at least one overlaps", () => {
    expect(
      permissionsSatisfy(["EVENT_OWNER"], { permissions: ["LEAGUE_OWNER", "EVENT_OWNER"] }),
    ).toBe(true);
  });

  it("rejects an any-of requirement with no overlap", () => {
    expect(
      permissionsSatisfy(["RESULT_EDITOR"], { permissions: ["LEAGUE_OWNER", "EVENT_OWNER"] }),
    ).toBe(false);
  });
});

describe("scopeChainSatisfies", () => {
  const scope = (
    permissions: string[],
    inheritsFrom?: EntityScopedPermissionCollection | null,
  ): EntityScopedPermissionCollection => ({ permissions, inheritsFrom });

  it("is false for a null/undefined scope", () => {
    expect(scopeChainSatisfies(null, { permission: "LEAGUE_OWNER" })).toBe(false);
    expect(scopeChainSatisfies(undefined, { permission: "LEAGUE_OWNER" })).toBe(false);
  });

  it("matches when the immediate scope grants the permission", () => {
    expect(
      scopeChainSatisfies(scope(["LEAGUE_OWNER"]), { permission: "LEAGUE_OWNER" }),
    ).toBe(true);
  });

  it("matches when an inherited scope grants the permission", () => {
    expect(
      scopeChainSatisfies(
        scope(["EVENT_OWNER"], scope(["LEAGUE_OWNER"])),
        { permission: "LEAGUE_OWNER" },
      ),
    ).toBe(true);
  });

  it("is false when no node in the chain grants the permission", () => {
    expect(
      scopeChainSatisfies(
        scope(["EVENT_OWNER"], scope(["RESULT_EDITOR"])),
        { permission: "LEAGUE_OWNER" },
      ),
    ).toBe(false);
  });
});

describe("scopeChainHasAnyPermission", () => {
  const scope = (
    permissions: string[],
    inheritsFrom?: EntityScopedPermissionCollection | null,
  ): EntityScopedPermissionCollection => ({ permissions, inheritsFrom });

  it("is false for a null/undefined scope", () => {
    expect(scopeChainHasAnyPermission(null)).toBe(false);
    expect(scopeChainHasAnyPermission(undefined)).toBe(false);
  });

  it("is false when the whole chain is empty", () => {
    expect(scopeChainHasAnyPermission(scope([], scope([])))).toBe(false);
  });

  it("is true for a grant held directly on the scope", () => {
    expect(scopeChainHasAnyPermission(scope(["EVENT_OWNER"]))).toBe(true);
  });

  it("is true for a derived scope whose only grant sits on the parent", () => {
    // The shape a backend sends for an event under a league the reader owns: the
    // event row carries nothing, the league behind it carries the grant.
    expect(scopeChainHasAnyPermission(scope([], scope(["LEAGUE_OWNER"])))).toBe(true);
  });

  it("walks past more than one empty link", () => {
    expect(
      scopeChainHasAnyPermission(scope([], scope([], scope(["LEAGUE_OWNER"])))),
    ).toBe(true);
  });
});

describe("a chain the server cut short", () => {
  it("accepts a fragment whose inner node has no `inheritsFrom` of its own", () => {
    // A GraphQL fragment spells the chain out to a fixed depth, so the inner node is
    // a narrower type than the outer one. Both helpers must still take it.
    const fragment = {
      permissions: [] as string[],
      inheritsFrom: { permissions: ["LEAGUE_OWNER"] },
    };

    expect(scopeChainSatisfies(fragment, { permission: "LEAGUE_OWNER" })).toBe(true);
    expect(scopeChainHasAnyPermission(fragment)).toBe(true);
  });
});
