import type { CDPSession, Page } from "@playwright/test";

import { expect, test } from "./fixtures";

/**
 * The passkey flow, against a virtual authenticator.
 *
 * Chrome's WebAuthn CDP domain gives the page a real authenticator implemented in the
 * browser: it generates a key pair, signs, and refuses when it is told to. That is what
 * makes these tests worth having — everything up to the signature is exercised for real,
 * including the part most likely to be wrong, which is the shape the server's options reach
 * `@simplewebauthn/browser` in.
 *
 * The playground's backend is a mock and does not verify the signature; that is tested
 * against the real library in `Director.Identity.WebAuthn`'s ceremony tests. What is proven
 * here is the layer's own contract, end to end in a browser.
 */

interface VirtualAuthenticator {
  session: CDPSession
  authenticatorId: string
}

async function addVirtualAuthenticator(page: Page): Promise<VirtualAuthenticator> {
  const session = await page.context().newCDPSession(page);

  await session.send("WebAuthn.enable");

  const { authenticatorId } = await session.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      // A platform authenticator with discoverable credentials — a phone or a laptop's
      // secure enclave, which is what a passkey normally lives in.
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  return { session, authenticatorId };
}

test("a passkey enrols against a real authenticator", async ({ page }) => {
  await addVirtualAuthenticator(page);

  await page.goto("/identity");
  await page.getByLabel("Username").fill("demo");
  await page.getByLabel("Password").fill("demo");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Signed in as")).toBeVisible();

  await page.getByTestId("passkey-enrol").click();

  await expect(page.getByTestId("passkey-status")).toHaveText("Passkey enrolled.");
});

/**
 * The credential is created by the authenticator, not by the page — so this asserts the
 * ceremony actually reached it rather than that a promise resolved.
 */
test("enrolment leaves a credential on the authenticator", async ({ page }) => {
  const { session, authenticatorId } = await addVirtualAuthenticator(page);

  await page.goto("/identity");
  await page.getByLabel("Username").fill("demo");
  await page.getByLabel("Password").fill("demo");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByTestId("passkey-enrol").click();
  await expect(page.getByTestId("passkey-status")).toHaveText("Passkey enrolled.");

  const { credentials } = await session.send("WebAuthn.getCredentials", { authenticatorId });

  expect(credentials).toHaveLength(1);
  expect(credentials[0]!.isResidentCredential).toBe(true);
});

test("an enrolled passkey signs an assertion", async ({ page }) => {
  await addVirtualAuthenticator(page);

  await page.goto("/identity");
  await page.getByLabel("Username").fill("demo");
  await page.getByLabel("Password").fill("demo");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByTestId("passkey-enrol").click();
  await expect(page.getByTestId("passkey-status")).toHaveText("Passkey enrolled.");

  await page.getByRole("button", { name: "Sign out" }).click();

  // Discoverable: the sign-in asks for no username, and the authenticator picks the
  // credential it holds.
  await page.getByTestId("passkey-signin").click();

  await expect(page.getByTestId("passkey-status")).toContainText("Assertion signed");
});

/*
 * Cancellation is deliberately not tested here.
 *
 * The obvious way to provoke it — a virtual authenticator with presence simulation turned
 * off — does not cancel anything: the browser waits out the ceremony's full timeout before
 * raising `NotAllowedError`, so the test costs a minute and asserts Chrome's clock more
 * than our behaviour.
 *
 * What is ours is the mapping from that error to `Cancelled`, and that is covered
 * deterministically in `transports/passkey.spec.ts`, where the rejection is injected
 * directly. A slow, timing-dependent copy of it here would be worse than none.
 */

/** With no authenticator at all, the buttons are simply not offered. */
test("a browser without WebAuthn is offered nothing", async ({ page }) => {
  await page.addInitScript(() => {
    // Removing the entry point is how a browser without WebAuthn looks to the library.
    Object.defineProperty(window, "PublicKeyCredential", { value: undefined });
  });

  await page.goto("/identity");

  await expect(page.getByTestId("passkey-signin")).toBeHidden();
});
