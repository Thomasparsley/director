import { expect, test } from "./fixtures";

// The unit suite mocks NuxtLink and the router (ADR-0008); this is where the real ones run.
// Active state is published as `aria-current="page"` on leaf links; parents render as
// accordion trigger buttons that auto-expand when they own the route (useNavigation).
// All queries are scoped to the sidebar so page content never collides with nav labels.

function nav(page: import("@playwright/test").Page) {
  return page.getByRole("navigation", { name: "Main" });
}

test("clicking a nav item navigates and moves the active marker", async ({ page }) => {
  await page.goto("/");

  const dashboard = nav(page).getByRole("link", { name: "Dashboard" });
  const forms = nav(page).getByRole("link", { name: "Forms" });

  // On "/", the root link owns the route.
  await expect(dashboard).toHaveAttribute("aria-current", "page");
  await expect(forms).not.toHaveAttribute("aria-current", "page");

  await forms.click();
  await expect(page).toHaveURL("/forms");

  // The marker moved — new item lit, old item dark — without a full reload.
  await expect(forms).toHaveAttribute("aria-current", "page");
  await expect(dashboard).not.toHaveAttribute("aria-current", "page");
});

test("deep-linking a child route auto-expands its parent and lights the child", async ({ page }) => {
  // This is ADR-0016 ("resolves its active item once") under a real router, and the reason
  // playground/app/pages/[...slug].vue exists.
  await page.goto("/leagues/mine");

  const leagues = nav(page).getByRole("button", { name: /Leagues/ });
  await expect(leagues).toHaveAttribute("aria-expanded", "true");

  const myLeagues = nav(page).getByRole("link", { name: /My leagues/ });
  await expect(myLeagues).toBeVisible();
  await expect(myLeagues).toHaveAttribute("aria-current", "page");
});

test("browser back/forward moves the active marker without reloading", async ({ page }) => {
  await page.goto("/");
  await nav(page).getByRole("link", { name: "Forms" }).click();
  await expect(page).toHaveURL("/forms");

  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(nav(page).getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");

  await page.goForward();
  await expect(page).toHaveURL("/forms");
  await expect(nav(page).getByRole("link", { name: "Forms" })).toHaveAttribute("aria-current", "page");
});

test("a disabled item is not a link and does not navigate", async ({ page }) => {
  await page.goto("/");

  // "Tools" is disabled: it renders as a <span>, so it has no link role at all.
  await expect(nav(page).getByRole("link", { name: "Tools" })).toHaveCount(0);

  // Force past the disabled affordance (pointer-events: none) to prove that even a
  // click that lands does not navigate — there is no href to follow.
  await nav(page).getByText("Tools", { exact: true }).click({ force: true });
  await expect(page).toHaveURL("/");
});

test("the sidebar stays usable when collapsed", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Toggle sidebar" }).click();

  // Collapsed, leaf labels move to sr-only text, so links keep their accessible names.
  await nav(page).getByRole("link", { name: "Forms" }).click();
  await expect(page).toHaveURL("/forms");
});

test("items render their auto-imported icons and badges", async ({ page }) => {
  await page.goto("/");

  // The lucide icon is the auto-import the unit tests stub via test/icons.ts.
  await expect(nav(page).getByRole("link", { name: "Dashboard" }).locator("svg")).toHaveCount(1);

  // The "12" badge sits on the Leagues parent, which is always visible.
  await expect(nav(page).getByRole("button", { name: /Leagues/ }).getByText("12")).toBeVisible();
});

test("a focused nav link activates on Enter", async ({ page }) => {
  await page.goto("/");

  const forms = nav(page).getByRole("link", { name: "Forms" });
  await forms.focus();
  await expect(forms).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/forms");
});
