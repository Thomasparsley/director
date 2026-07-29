import { expect, test } from "./fixtures";

// Against /forms: raw useFormGroup + native inputs. The unit specs prove the model
// exhaustively (ADR-0008); each scenario here exists to prove a *wired* flow reaching
// the real DOM — status → disabled attribute, lazy transformer timing on blur, nested
// group status bubbling to the badge, the submit pending window (ADR-0014).

/** Parse the "Live form data" <pre> (always the first one) into an object. */
async function readLiveData(page: import("@playwright/test").Page): Promise<Record<string, unknown>> {
  const text = await page.locator("pre").first().textContent();
  return JSON.parse(text ?? "{}");
}

test("submit is disabled on a pristine form and enabled once edited", async ({ page }) => {
  await page.goto("/forms");

  const submit = page.getByRole("button", { name: "Submit" });
  await expect(submit).toBeDisabled();
  await expect(page.getByText("Pristine", { exact: true })).toBeVisible();

  await page.getByLabel("Name").fill("Jane");
  await expect(submit).toBeEnabled();
  await expect(page.getByText("Dirty", { exact: true })).toBeVisible();
});

test("blurring the name trims it — value and live data both settle to the trimmed string", async ({ page }) => {
  await page.goto("/forms");

  const name = page.getByLabel("Name");
  await name.fill("  Jane  ");
  // Before blur the lazy trim transformer has not run.
  await expect(name).toHaveValue("  Jane  ");

  await name.blur();
  await expect(name).toHaveValue("Jane");
  expect((await readLiveData(page)).name).toBe("Jane");
});

test("an invalid email shows its message on blur and clears when fixed", async ({ page }) => {
  await page.goto("/forms");

  const email = page.getByLabel("Email");
  await email.fill("not-an-email");
  await email.blur();
  await expect(page.getByText("Error", { exact: true })).toBeVisible();

  await email.fill("jane@example.com");
  await email.blur();
  await expect(page.getByText("Error", { exact: true })).toHaveCount(0);
});

test("an error in the nested address group flips the parent status badge to Error", async ({ page }) => {
  await page.goto("/forms");

  // City is required and lives in the child group; touching and leaving it empty must
  // surface as the whole form's status, not just the child's.
  const city = page.getByLabel("City");
  await city.focus();
  await city.blur();

  await expect(page.getByText("Error", { exact: true })).toBeVisible();
});

test("Patch example data fills every field including the nested group and reads dirty", async ({ page }) => {
  await page.goto("/forms");

  await page.getByRole("button", { name: "Patch example data" }).click();

  // Patch writes raw values (no lazy trim until a field blurs), and marks the form dirty.
  await expect(page.getByLabel("Name")).toHaveValue("  Jane Doe  ");
  await expect(page.getByLabel("City")).toHaveValue("Prague");
  await expect(page.getByText("Dirty", { exact: true })).toBeVisible();

  const data = await readLiveData(page);
  expect(data).toMatchObject({
    email: "jane@example.com",
    age: 42,
    address: { city: "Prague", street: "Na Příkopě 1" },
  });
});

test("submit shows the pending state, then reveals the submitted payload", async ({ page }) => {
  await page.goto("/forms");

  await page.getByLabel("Name").fill("Jane");
  await page.getByLabel("Email").fill("jane@example.com");
  await page.getByLabel("City").fill("Prague"); // required — the form won't submit without it

  const submit = page.getByRole("button", { name: "Submit" });
  await submit.click();

  // The 800ms fake request: the button reads "Submitting…" and is disabled meanwhile
  // (ADR-0014 — the payload must not appear before the wait resolves).
  await expect(page.getByRole("button", { name: "Submitting…" })).toBeDisabled();

  await expect(page.getByRole("heading", { name: "Last submitted payload" })).toBeVisible();
  const payload = JSON.parse((await page.locator("pre").nth(1).textContent()) ?? "{}");
  expect(payload).toMatchObject({ name: "Jane", email: "jane@example.com", address: { city: "Prague" } });
});

test("Reset returns fields, status, and live data to pristine", async ({ page }) => {
  await page.goto("/forms");

  await page.getByLabel("Name").fill("Jane");
  await expect(page.getByText("Dirty", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Reset" }).click();

  await expect(page.getByLabel("Name")).toHaveValue("");
  await expect(page.getByText("Pristine", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit" })).toBeDisabled();
});
