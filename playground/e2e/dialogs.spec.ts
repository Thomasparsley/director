import { expect, test } from "./fixtures";

// Against /dialogs: @directorkit/dialogs holds state, not paint (ADR-0017). The playground's
// DialogHost is the consumer's rendering shell; these tests drive the state contract through
// it — open/close, the manager's stack, and a value resolving back to the opener. Focus
// trapping/restoration is a paint concern this minimal host does not implement, so it is not
// asserted here.

test("opening the picker shows a dialog; choosing a value resolves it to the opener", async ({ page }) => {
  await page.goto("/dialogs");

  await page.getByRole("button", { name: "Open picker" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Pick a fruit")).toBeVisible();

  await dialog.getByRole("button", { name: "Apple" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("You picked:")).toContainText("apple");
});

test("Escape closes an open dialog", async ({ page }) => {
  await page.goto("/dialogs");

  await page.getByRole("button", { name: "Open picker" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("clicking the overlay closes an open dialog", async ({ page }) => {
  await page.goto("/dialogs");

  await page.getByRole("button", { name: "Open picker" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Click a corner of the overlay, away from the centered panel.
  await page.locator("[data-dialog-overlay]").click({ position: { x: 10, y: 10 } });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a stacked dialog closes back to the one beneath it", async ({ page }) => {
  await page.goto("/dialogs");

  await page.getByRole("button", { name: "Open stack" }).click();
  await expect(page.getByText("Outer dialog")).toBeVisible();

  await page.getByRole("button", { name: "Open nested" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(2);

  // Escape closes only the topmost dialog; the outer one remains.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByText("Outer dialog")).toBeVisible();
});

test("navigating away unregisters and dismisses open dialogs", async ({ page }) => {
  await page.goto("/dialogs");

  await page.getByRole("button", { name: "Open picker" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // The dialog is registered by the page; leaving it unmounts and unregisters the dialog.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Forms" }).click();
  await expect(page).toHaveURL("/forms");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
