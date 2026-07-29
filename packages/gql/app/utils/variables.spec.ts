import { describe, expect, it } from "vitest";
import { computed, ref } from "vue";
import type { TadaDocumentNode } from "gql.tada";

import { getVariables } from "./variables";

/** A document that takes variables, and one that takes none. */
type FindUser = TadaDocumentNode<{ user: { id: string } }, { id: string }>;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type ListUsers = TadaDocumentNode<{ users: { id: string }[] }, {}>;

describe("getVariables", () => {
  it("passes a plain object straight through", () => {
    expect(getVariables<FindUser>({ id: "1" })).toEqual({ id: "1" });
  });

  it("unwraps a ref", () => {
    expect(getVariables<FindUser>(ref({ id: "1" }))).toEqual({ id: "1" });
  });

  it("unwraps a computed, re-reading it each time", () => {
    const id = ref("1");
    const variables = computed(() => ({ id: id.value }));

    expect(getVariables<FindUser>(variables)).toEqual({ id: "1" });

    id.value = "2";
    expect(getVariables<FindUser>(variables)).toEqual({ id: "2" });
  });

  it("answers undefined for undefined", () => {
    expect(getVariables<FindUser>(undefined)).toBeUndefined();
  });

  it("answers undefined for a ref holding nothing", () => {
    const empty = ref<{ id: string } | undefined>(undefined);

    expect(getVariables<FindUser>(empty as never)).toBeUndefined();
  });

  it("keeps an empty object — a document may legitimately take no variables", () => {
    expect(getVariables<ListUsers>({})).toEqual({});
  });
});
