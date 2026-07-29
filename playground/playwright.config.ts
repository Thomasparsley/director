import { defineConfig, devices } from "@playwright/test";

// E2E runs against a *production* build of the playground (`nuxt build` →
// `node .output/server/index.mjs`), not `nuxt dev`: it is what ships, it exercises
// SSR the way a consumer sees it, and it removes dev-server HMR/warm-up flake.
// See docs/e2e-test-plan.md §2 for the full rationale.

// Overridable so a local run can dodge an unrelated app already listening on 3000 —
// with `reuseExistingServer`, the suite would otherwise silently test THAT app.
// Nitro reads the same PORT variable, so the built server and baseURL stay in sync.
const port = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Fail the build if test.only is committed.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html"]] : "list",

  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
    // Pin time and locale so date/time controls and calendar month/day names do not
    // float with the runner. Assertions still avoid "today"-relative values.
    timezoneId: "Europe/Prague",
    locale: "en-US",
  },

  webServer: {
    // The build is the long pole; one build per run, amortized across every spec.
    command: "pnpm build && node .output/server/index.mjs",
    port,
    // Locally, point the suite at a running `pnpm dev` for fast iteration.
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
