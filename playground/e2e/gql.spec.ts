import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// Against /gql: @directorkit/gql builds one urql client from `app.config` and the playground
// points it at its own toy GraphQL server (server/api/graphql.post.ts). These tests drive
// the wiring the unit suite cannot reach — SSR fetching over HTTP and hydrating from the
// payload, reactive variables refetching, and the two failure channels (a payload's own
// `errors` list versus a GraphQL execution error routed to `gql.notify`).
//
// The server's book list is process-wide state and specs run in parallel, so anything
// added here carries a title unique to its test.

/**
 * The list is server-rendered, so its controls are in the DOM — and clickable — before
 * their handlers exist. The page keeps them disabled until it mounts, which is both the
 * honest UX and the signal to wait on here.
 */
async function whenHydrated(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "Add book" })).toBeEnabled();
}

test("the list is server-rendered and hydrates without refetching", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/graphql")) {
      requests.push(request.url());
    }
  });

  await page.goto("/gql");

  // Present in the SSR markup, so it is on screen before any client fetch could land.
  await expect(page.getByRole("list", { name: "Books" }).getByRole("listitem").first())
    .toContainText("Structure and Interpretation of Computer Programs");

  await whenHydrated(page);

  // The payload carried the result, so hydration reused it rather than asking again.
  expect(requests).toEqual([]);
});

test("typing in the search box refetches with the new variables", async ({ page }) => {
  await page.goto("/gql");

  await whenHydrated(page);

  const books = page.getByRole("list", { name: "Books" }).getByRole("listitem");
  await expect(books.filter({ hasText: "The Mythical Man-Month" })).toHaveCount(1);

  // Narrowing to a single seeded author proves the new variables reached the server.
  await page.getByLabel("Search").fill("Fowler");
  await expect(books).toHaveCount(1);
  await expect(books.first()).toContainText("Refactoring");

  // …and clearing it brings back a title that the filter had excluded.
  await page.getByLabel("Search").fill("");
  await expect(books.filter({ hasText: "The Mythical Man-Month" })).toHaveCount(1);
});

test("adding a book round-trips the mutation and shows up in the list", async ({ page }) => {
  await page.goto("/gql");

  await whenHydrated(page);

  // The server's shelf is process-wide and the local suite can run against a long-lived
  // `pnpm dev`, so a fixed title would be a duplicate the second time round.
  const marker = `run-${Date.now()}`;
  const title = `The Pragmatic Programmer ${marker}`;

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Author").fill("Hunt");
  await page.getByRole("button", { name: "Add book" }).click();

  await expect(page.getByRole("alert")).toContainText(`Added "${title}"`);

  // The list picks it up on the next fetch, which the search box triggers.
  await page.getByLabel("Search").fill(marker);
  await expect(page.getByRole("list", { name: "Books" }).getByRole("listitem").first())
    .toContainText(title);
});

test("a payload-level error reaches its typed handler, not the notice list", async ({ page }) => {
  await page.goto("/gql");

  await whenHydrated(page);

  // Seeded by the server, so adding it again is always a duplicate.
  await page.getByLabel("Title").fill("Refactoring");
  await page.getByLabel("Author").fill("Fowler");
  await page.getByRole("button", { name: "Add book" }).click();

  // handleMutationResult dispatched to `onDuplicateTitle`…
  await expect(page.getByRole("alert")).toContainText("already on the shelf");

  // …and did NOT also announce it through `gql.notify`: a handled error is reported once.
  await expect(page.getByRole("list", { name: "Notices" }).getByRole("listitem"))
    .toHaveCount(0);
});

test("a GraphQL execution error is routed to gql.notify", async ({ page }) => {
  await page.goto("/gql");

  await whenHydrated(page);

  await page.getByRole("button", { name: "Trigger a server error" }).click();

  const notices = page.getByRole("list", { name: "Notices" }).getByRole("listitem");
  await expect(notices).toHaveCount(1);
  await expect(notices.first()).toContainText("The server refused to answer.");
});
