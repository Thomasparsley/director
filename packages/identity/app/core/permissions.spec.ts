import { describe, expect, it } from "vitest";

import type { EntityScopedPermissionCollection } from "../types/permissions";

import { permissionsSatisfy, scopeChainSatisfies } from "./permissions";

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
