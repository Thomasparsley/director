import { expect, test } from "./fixtures";

// Against /filters: the layer's contract is form ⇄ URL, which only a real router + real
// browser history can prove. The unit suite needed an app-unmount workaround just to run;
// here the encode/decode meets the actual address bar. The query storage throttles writes
// (500ms) and uses router.replace, so URL assertions auto-retry and there is no filter
// history to walk with back/forward.

function peopleList(page: import("@playwright/test").Page) {
  return page.getByRole("list", { name: "People" });
}

test("typing a search term filters the list and writes the query param", async ({ page }) => {
  await page.goto("/filters");
  await expect(peopleList(page).getByRole("listitem")).toHaveCount(5);

  await page.getByLabel("Search").fill("grace");

  await expect(peopleList(page).getByRole("listitem")).toHaveText(["Grace Hopper"]);
  await expect(page).toHaveURL(/search=grace/);
});

test("selecting a role filters the list and writes the query param", async ({ page }) => {
  await page.goto("/filters");

  await page.getByLabel("Role").selectOption("editor");

  await expect(peopleList(page).getByRole("listitem")).toHaveText(["Alan Turing", "Grace Hopper"]);
  await expect(page).toHaveURL(/role=editor/);
});

test("deep-linking a filtered URL hydrates the form and pre-filters the list", async ({ page }) => {
  await page.goto("/filters?search=grace&role=editor");

  // The form is seeded from the query on load (and the consoleGuard asserts no hydration
  // mismatch — the server and client agree on the pre-filtered markup).
  await expect(page.getByLabel("Search")).toHaveValue("grace");
  await expect(page.getByLabel("Role")).toHaveValue("editor");
  await expect(peopleList(page).getByRole("listitem")).toHaveText(["Grace Hopper"]);
});

test("clearing a filter restores the list and drops the value from the URL", async ({ page }) => {
  await page.goto("/filters?search=grace");
  await expect(peopleList(page).getByRole("listitem")).toHaveText(["Grace Hopper"]);

  await page.getByLabel("Search").fill("");

  await expect(peopleList(page).getByRole("listitem")).toHaveCount(5);
  await expect(page).not.toHaveURL(/grace/);
});

test("the serialized-object filter round-trips a non-ASCII value through the URL", async ({ page }) => {
  // Regression guard for the btoa/UTF-8 fix from the firesport port: the value is JSON →
  // UTF-8-safe base64 → URL-encoded, and must survive a full reload from the resulting URL.
  await page.goto("/filters");

  await page.getByLabel("Term").fill("Příliš žluťoučký");
  await expect(page).toHaveURL(/adv=/);

  const encodedUrl = page.url();
  await page.goto(encodedUrl);

  await expect(page.getByLabel("Term")).toHaveValue("Příliš žluťoučký");
});
