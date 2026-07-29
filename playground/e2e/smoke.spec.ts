import { expect, test } from "./fixtures";

/**
 * The route list is literal and colocated on purpose: adding a page without a smoke
 * entry is then a visible omission in review — the sixth part of ADR-0009's
 * five-part "add a layer" ritual. `ssrMarker` is a string the server must have
 * rendered into the initial HTML, proving SSR produced real markup rather than an
 * empty shell the client later fills.
 *
 */
const ROUTES: Array<{ path: string; heading: string; ssrMarker: string }> = [
  { path: "/", heading: "Buttons", ssrMarker: "Buttons" },
  { path: "/forms", heading: "User form", ssrMarker: "User form" },
  { path: "/form-ui", heading: "Live form data", ssrMarker: "Live form data" },
  { path: "/filters", heading: "People filter (query per field)", ssrMarker: "People filter" },
  { path: "/dialogs", heading: "Modal dialogs", ssrMarker: "Modal dialogs" },
  { path: "/identity", heading: "Identity session", ssrMarker: "Identity session" },
  // Catch-all fixture route (playground/app/pages/[...slug].vue) — proves the router
  // resolves arbitrary demo links, which the navigation's active state keys off.
  { path: "/leagues/mine", heading: "/leagues/mine", ssrMarker: "/leagues/mine" },
];

for (const route of ROUTES) {
  test(`${route.path} renders clean, server-side and hydrated`, async ({ page }) => {
    // 1. The server rendered real markup (SSR), not an empty shell.
    const response = await page.request.get(route.path);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(route.ssrMarker);

    // 2. The hydrated page shows its heading. The consoleGuard fixture asserts
    //    zero console errors/warnings (incl. hydration mismatches) at teardown.
    const navigation = await page.goto(route.path);
    expect(navigation?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
  });
}
