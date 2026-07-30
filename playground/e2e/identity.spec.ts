import { expect, test } from "./fixtures";

// Against /identity: @director/identity holds session state; the playground supplies
// the backend as an in-browser mock via the `IdentityApi` interface in app.config
// (demo / demo). These tests drive the consumer contract — bootstrap settling to
// anonymous, login loading the user, the marker cookies carrying the session across
// a reload, and logout dropping back to anonymous.

test("bootstrap settles an unauthenticated visit to anonymous", async ({ page }) => {
  await page.goto("/identity");

  await expect(page.getByText("Session status:")).toContainText("anonymous");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});

test("signing in loads the user, survives a reload, and signs out again", async ({ page }) => {
  await page.goto("/identity");

  await page.getByLabel("Username").fill("demo");
  await page.getByLabel("Password").fill("demo");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByText("Session status:")).toContainText("authenticated");
  await expect(page.getByText("Signed in as")).toContainText("Demo User");

  // The marker cookies persist the session across a reload: SSR leaves the session
  // `unknown` (the mock backend lives in the browser), and the client bootstrap
  // recovers it from the cookie.
  await page.reload();
  await expect(page.getByText("Signed in as")).toContainText("Demo User");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByText("Session status:")).toContainText("anonymous");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});

test("wrong credentials surface an error and stay anonymous", async ({ page }) => {
  await page.goto("/identity");

  await page.getByLabel("Username").fill("demo");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByRole("alert")).toContainText("Login failed");
  await expect(page.getByText("Session status:")).toContainText("anonymous");
});
