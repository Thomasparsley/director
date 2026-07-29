import { expect, test } from "./fixtures";

// Against /form-ui: one focused scenario per DForm* control. This is the suite happy-dom
// fundamentally can't host — real teleports, popovers, pointer capture, calendar grids
// (the whole stub list in packages/ui/test/setup.ts). Exhaustive prop matrices stay in the
// unit specs; here we prove each control is wired to the form model through the real DOM.

async function readLiveData(page: import("@playwright/test").Page): Promise<Record<string, unknown>> {
  const text = await page.locator("pre").first().textContent();
  return JSON.parse(text ?? "{}");
}

/** The two date groups are unnamed and identical by role; birthday is first in DOM order. */
function birthdaySegment(page: import("@playwright/test").Page, name: string) {
  return page.getByRole("spinbutton", { name }).first();
}

/** The Starts group is the only date group that also carries a calendar trigger button. */
function startsGroup(page: import("@playwright/test").Page) {
  return page.getByRole("group")
    .filter({ has: page.getByRole("spinbutton", { name: "year," }) })
    .filter({ has: page.getByRole("button") });
}

test("DFormInput: clicking the label focuses the input, and the description renders", async ({ page }) => {
  await page.goto("/form-ui");

  await expect(page.getByText("Trimmed on blur.")).toBeVisible();
  // The field's <label for=id> ("Name *") focuses its input when clicked.
  await page.locator("label").filter({ hasText: /^Name/ }).click();
  await expect(page.getByRole("textbox", { name: "Name" })).toBeFocused();
});

test("DFormSelect: opens, selects an option, and rejects the disabled one", async ({ page }) => {
  await page.goto("/form-ui");

  const role = page.getByRole("combobox", { name: "Role" });
  await role.click();

  await expect(page.getByRole("option", { name: "Owner (taken)" })).toBeDisabled();

  await page.getByRole("option", { name: "Editor" }).click();
  await expect(role).toContainText("Editor");
  expect((await readLiveData(page)).role).toBe("editor");
});

test("DFormInputNumber: steps up from the min and clamps at the max", async ({ page }) => {
  await page.goto("/form-ui");

  const seats = page.getByRole("spinbutton", { name: "Seats" });
  await expect(page.getByRole("button", { name: "Decrease" })).toBeDisabled(); // at min (1)

  // Keyboard stepping is the stable path — the stepper buttons render disabled in SSR
  // markup and only enable post-hydration.
  await seats.focus();
  await seats.press("ArrowUp");
  await expect(seats).toHaveValue("2");
  expect((await readLiveData(page)).seats).toBe(2);

  await seats.fill("50");
  await seats.blur();
  await seats.focus();
  await seats.press("ArrowUp");
  await expect(seats).toHaveValue("50"); // clamped at max
});

test("DFormDateField: typing the segments produces a Date in live data", async ({ page }) => {
  await page.goto("/form-ui");

  await birthdaySegment(page, "month,").click();
  await page.keyboard.type("07152026");

  // The control stores a real Date, serialized to an ISO string in live data. (The exact
  // day is a UTC-offset concern proved in the unit specs; here we assert it got wired.)
  const birthday = await readLiveData(page).then(d => d.birthday);
  expect(birthday).not.toBeNull();
  expect(String(birthday)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test("DFormDatePicker: picking a day from the calendar fills the field, and Escape closes it", async ({ page }) => {
  await page.goto("/form-ui");

  await startsGroup(page).getByRole("button").click();
  // The calendar opens in a popover dialog; its days are gridcells (there is no `grid` role).
  const calendar = page.getByRole("dialog");
  await expect(calendar).toBeVisible();

  await calendar.getByRole("gridcell", { name: / 15, / }).getByRole("button").click();
  expect((await readLiveData(page)).starts).not.toBeNull();

  // This picker keeps the calendar open after a pick; Escape dismisses it (validate-on-close).
  await page.keyboard.press("Escape");
  await expect(calendar).toBeHidden();
});

test("DFormTimeField: setting 10:15 stores the HH:mm string", async ({ page }) => {
  await page.goto("/form-ui");

  await page.getByRole("spinbutton", { name: "hour," }).click();
  await page.keyboard.type("1015");

  expect((await readLiveData(page)).standup).toBe("10:15");
});

test("DFormPinInput: typing five digits fills the joined OTP string", async ({ page }) => {
  await page.goto("/form-ui");

  await page.getByRole("textbox", { name: "pin input 1 of 5" }).click();
  await page.keyboard.type("12345");

  expect((await readLiveData(page)).otp).toBe("12345");
});

test("DFormPinInput: an incomplete code fails the min-length rule on blur", async ({ page }) => {
  await page.goto("/form-ui");

  await page.getByRole("textbox", { name: "pin input 1 of 5" }).click();
  await page.keyboard.type("123");
  await page.getByRole("textbox", { name: "pin input 3 of 5" }).blur();

  await expect(page.getByRole("alert")).toHaveCount(1);
});

test("DFormSwitch: toggles by click and by keyboard", async ({ page }) => {
  await page.goto("/form-ui");

  const newsletter = page.getByRole("switch", { name: "Newsletter" });
  await newsletter.click();
  await expect(newsletter).toBeChecked();
  expect((await readLiveData(page)).newsletter).toBe(true);

  await newsletter.press("Space");
  await expect(newsletter).not.toBeChecked();
  expect((await readLiveData(page)).newsletter).toBe(false);
});

test("submitting the empty form surfaces every required field's error at once", async ({ page }) => {
  await page.goto("/form-ui");

  // Toggle the (validator-free) Newsletter switch to make the form dirty so Submit enables.
  // A text field can't be used to dirty the form here: clicking Submit blurs it first, which
  // validates it into an error and disables Submit before the click lands.
  await page.getByRole("switch", { name: "Newsletter" }).click();

  await page.getByRole("button", { name: "Submit" }).click();

  // name, email, role, birthday (required) + otp (min-length) all fail together. Validation
  // is async, so poll until the alerts settle rather than reading once.
  await expect.poll(() => page.getByRole("alert").count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByRole("heading", { name: "Last submitted payload" })).toHaveCount(0);
});

test("a fully valid form submits with every value typed intact", async ({ page }) => {
  await page.goto("/form-ui");

  await page.getByRole("textbox", { name: "Name" }).fill("Jane");
  await page.getByRole("textbox", { name: "Email" }).fill("jane@example.com");

  await page.getByRole("combobox", { name: "Role" }).click();
  await page.getByRole("option", { name: "Editor" }).click();

  await birthdaySegment(page, "month,").click();
  await page.keyboard.type("07152026");

  await page.getByRole("textbox", { name: "pin input 1 of 5" }).click();
  await page.keyboard.type("12345");

  await page.getByRole("switch", { name: "Newsletter" }).click();

  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByRole("heading", { name: "Last submitted payload" })).toBeVisible();
  const payload = JSON.parse((await page.locator("pre").nth(1).textContent()) ?? "{}");
  expect(payload).toMatchObject({
    name: "Jane",
    email: "jane@example.com",
    role: "editor",
    seats: 1,
    newsletter: true,
    otp: "12345",
    standup: "09:30",
  });
  // Types survived the round-trip through the controls, not just the values.
  expect(typeof payload.seats).toBe("number");
  expect(typeof payload.newsletter).toBe("boolean");
  expect(String(payload.birthday)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});
