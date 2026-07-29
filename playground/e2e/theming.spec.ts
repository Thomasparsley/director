import { expect, test } from "./fixtures";

// Dark mode is real @nuxtjs/color-mode wiring (classSuffix: "", so the root class is
// `dark`/`light` and Uno's `.dark` tokens flip with it). The unit suites never see it —
// this is the only place it is exercised. The shell uses fixed rail widths and makes no
// responsive claim, so there is no responsive test here by design.

function mainBackground(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.querySelector("main")!).backgroundColor);
}

test("toggling the theme flips the root class, repaints a token colour, and persists", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveClass(/light/);
  const lightBackground = await mainBackground(page);

  await page.getByRole("button", { name: "Toggle theme" }).click();

  await expect(html).toHaveClass(/dark/);
  expect(await mainBackground(page)).not.toBe(lightBackground);

  // color-mode persists the preference; a reload keeps dark rather than falling back.
  await page.reload();
  await expect(html).toHaveClass(/dark/);
});

test("prefers-color-scheme: dark is honoured on first load", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");

  // No toggle, no stored preference — the system setting alone drives the root class.
  await expect(page.locator("html")).toHaveClass(/dark/);
});
