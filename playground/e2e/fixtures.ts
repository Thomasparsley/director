import { test as base, expect } from "@playwright/test";

/**
 * Console/pageerror messages we tolerate. Start empty. Every entry must carry a
 * comment justifying why the noise is acceptable — an unjustified allow is a bug
 * hiding in plain sight. Matched against the message text (substring or RegExp).
 */
const CONSOLE_ALLOWLIST: Array<string | RegExp> = [
  // (none yet)
];

function isAllowed(text: string): boolean {
  return CONSOLE_ALLOWLIST.some(entry =>
    typeof entry === "string" ? text.includes(entry) : entry.test(text),
  );
}

/**
 * Every E2E test runs through this fixture, which collects `console.error` /
 * `console.warning` and uncaught `pageerror` events and fails the test at
 * teardown if any slipped through unallowlisted.
 *
 * This is what turns every page visit into a hydration check for free: Vue prints
 * hydration mismatches as console warnings, so any route any spec touches is
 * implicitly asserted hydration-clean. See docs/e2e-test-plan.md §3.
 */
export const test = base.extend<{ consoleGuard: void }>({
  consoleGuard: [
    async ({ page }, use) => {
      const problems: Array<string> = [];

      page.on("console", (message) => {
        const type = message.type();
        if (type !== "error" && type !== "warning") return;
        const text = message.text();
        if (isAllowed(text)) return;
        problems.push(`[console.${type}] ${text}`);
      });

      page.on("pageerror", (error) => {
        const text = `${error.name}: ${error.message}`;
        if (isAllowed(text)) return;
        problems.push(`[pageerror] ${text}`);
      });

      // Kill animations before any navigation: popover/vaul transitions are the
      // classic teleport flake source, and reduced motion removes them.
      await page.emulateMedia({ reducedMotion: "reduce" });

      await use();

      expect(problems, `Unexpected console output:\n${problems.join("\n")}`).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
