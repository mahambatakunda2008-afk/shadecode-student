import { test, devices, type Page } from "@playwright/test";
import fs from "node:fs";
import { signIn } from "../learn/auth";

/**
 * Accessibility + touch-target scan on a phone-sized viewport, using axe-core (fetched by the CI workflow into
 * e2e/vendor/axe.min.js, so there is no npm dependency). Report-only: it records findings and never fails the run.
 * Output: mobile-metrics/a11y.json, surfaced by CI as one annotation per page.
 */
const { defaultBrowserType: _ignored, ...pixel } = devices["Pixel 7"];
void _ignored;
test.use({ ...pixel, viewport: { width: 360, height: 740 } });

const AXE_PATH = "e2e/vendor/axe.min.js";
const OUT = "mobile-metrics";
const findings: Record<string, unknown>[] = [];

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));
test.afterAll(() => fs.writeFileSync(`${OUT}/a11y.json`, JSON.stringify(findings, null, 2)));
test.skip(!fs.existsSync(AXE_PATH), "axe-core not available (the workflow downloads it before the run).");

type AxeViolation = { id: string; impact: string; help: string; nodes: { target: string[]; html: string }[] };
type AxeWindow = { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: AxeViolation[] }> } };

async function scan(page: Page, route: string) {
  try {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await page.evaluate(fs.readFileSync(AXE_PATH, "utf8"));
    const violations = await page.evaluate(async () => {
      const r = await (window as unknown as AxeWindow).axe.run(document, {
        resultTypes: ["violations"],
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] },
      });
      const rank: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };
      return r.violations
        .map((v) => ({ id: v.id, impact: v.impact, help: v.help.slice(0, 70), count: v.nodes.length, samples: v.nodes.slice(0, 2).map((n) => `${n.target.join(" ")} :: ${n.html}`.slice(0, 170)) }))
        .sort((a, b) => (rank[a.impact] ?? 9) - (rank[b.impact] ?? 9));
    });
    const targets = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('a[href],button,[role="button"],[role="tab"],[role="radio"],input:not([type="hidden"]),select,textarea'));
      const small: string[] = [];
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || cs.display === "none") continue;
        if (el.tagName === "A" && cs.display === "inline" && el.closest("p,li")) continue; // WCAG 2.5.8 inline-link exception
        if (Math.min(r.width, r.height) < 36) small.push(`${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      return { interactive: els.length, smallCount: small.length, smallSamples: small.slice(0, 6) };
    });
    const byImpact: Record<string, number> = {};
    for (const v of violations) byImpact[v.impact] = (byImpact[v.impact] ?? 0) + v.count;
    findings.push({ page: route, byImpact, top: violations.slice(0, 5), ...targets });
  } catch (e) {
    findings.push({ page: route, error: String(e).slice(0, 200) });
  }
}

test.describe("public pages", () => {
  for (const route of ["/", "/auth/login", "/download"]) {
    test(`a11y scan ${route}`, async ({ page }) => {
      test.setTimeout(60_000);
      await scan(page, route);
    });
  }
});

test.describe("signed-in screens", () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "Set E2E_EMAIL and E2E_PASSWORD to scan signed-in screens.");
  test.setTimeout(240_000);
  test("a11y scan of the main screens", async ({ page }) => {
    await signIn(page);
    for (const route of ["/dashboard", "/learn", "/exam-sim", "/focus", "/timetable", "/analytics", "/subjects"]) await scan(page, route);
  });
});
