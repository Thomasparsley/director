import { expect, test } from "./fixtures";

// Against /identity: @directorkit/identity holds session state; the playground supplies
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

// The returning visitor. SSR cannot resolve this session (the mock backend lives in
// the browser), so the server renders with the session still `unknown` — and
// `isAuthorized` is `false` for "not known yet" exactly as it is for "no". A page that
// reads that as "logged out" ships a sign-in form to someone who never lost their
// login, then swaps it for their name once the client settles.
//
// The assertion runs over the DOM as it arrives rather than after it: a Playwright
// expectation only runs once hydration has already corrected whatever the server got
// wrong, so a MutationObserver installed before the first script is what makes "never
// flashed" assertable instead of inferred.
test("a returning visitor is never offered the login they never lost", async ({ page }) => {
  await page.goto("/identity");
  await page.getByLabel("Username").fill("demo");
  await page.getByLabel("Password").fill("demo");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Signed in as")).toContainText("Demo User");

  await page.addInitScript(() => {
    const sawLoginForm = () => document.querySelector("input[name='username']") !== null;
    Object.defineProperty(window, "__sawLoginForm", { value: sawLoginForm(), writable: true });
    new MutationObserver(() => {
      if (sawLoginForm()) {
        (window as unknown as { __sawLoginForm: boolean }).__sawLoginForm = true;
      }
    // `document`, not `documentElement`: at init-script time the root element does
    // not exist yet, and observing it would throw before the first byte is parsed.
    }).observe(document, { childList: true, subtree: true });
  });

  await page.reload();
  await expect(page.getByText("Signed in as")).toContainText("Demo User");

  const flashed = await page.evaluate(() => (window as unknown as { __sawLoginForm: boolean }).__sawLoginForm);
  expect(flashed).toBe(false);
});
