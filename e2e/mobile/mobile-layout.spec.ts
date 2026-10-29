import { test, expect, devices, type Page } from "@playwright/test";
import fs from "node:fs";
import { signIn } from "../learn/auth";

/**
 * Real-browser mobile layout checks (Pixel-class phone, 360x740, touch).
 * Public pages always run; signed-in screens run only when E2E_EMAIL / E2E_PASSWORD are set.
 * Measurements are written to mobile-metrics/metrics.json (and screenshots to mobile-metrics/shots) so CI can
 * surface them as annotations and attach them as artifacts, even when everything passes.
 */
const { defaultBrowserType: _ignored, ...pixel } = devices["Pixel 7"];
void _ignored;
test.use({ ...pixel, viewport: { width: 360, height: 740 } });

const OUT = "mobile-metrics";
const metrics: Record<string, unknown>[] = [];
test.beforeAll(() => fs.mkdirSync(`${OUT}/shots`, { recursive: true }));
test.afterAll(() => fs.writeFileSync(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 2)));

type Overflow = { scrollWidth: number; innerWidth: number; offenders: string[] };

/** Horizontal overflow: the page must never scroll sideways on a phone. Lists the elements that stick out. */
async function overflow(page: Page): Promise<Overflow> {
  return page.evaluate(() => {
    const innerWidth = window.innerWidth;
    const offenders: string[] = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= innerWidth + 1) return;
      if (getComputedStyle(el).position === "fixed") return;
      // Ignore content inside an intentionally scrollable/clipped container.
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) return;
      }
      offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)}`);
    });
    return { scrollWidth: document.documentElement.scrollWidth, innerWidth, offenders: offenders.slice(0, 8) };
  });
}

function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
  return errors;
}

const slug = (route: string) => (route === "/" ? "home" : route.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-"));

test.describe("public pages on a phone", () => {
  for (const route of ["/", "/auth/login", "/download"]) {
    test(`${route} does not scroll sideways and throws no page errors`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.goto(route);
      await page.waitForLoadState("networkidle").catch(() => undefined);
      const o = await overflow(page);
      await page.screenshot({ path: `${OUT}/shots/${slug(route)}.png`, fullPage: true });
      metrics.push({ page: route, ...o, pageErrors: errors });
      expect.soft(o.scrollWidth, `horizontal overflow on ${route}: ${o.offenders.join(" | ")}`).toBeLessThanOrEqual(o.innerWidth + 1);
      expect(errors, `uncaught page errors on ${route}`).toEqual([]);
    });
  }

  test("landing: header stays pinned while scrolling and Sign in is reachable", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header").first();
    await expect(header).toBeVisible();
    const signIn = header.locator('a[href="/auth/login"]');
    await expect(signIn, "Sign in link must be visible on phones").toBeVisible();
    const box = await signIn.boundingBox();
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(300);
    const top = (await header.boundingBox())?.y ?? 999;
    metrics.push({ page: "/", headerTopAfterScroll: top, signInHeight: box?.height, signInWidth: box?.width });
    expect(Math.abs(top), "sticky header must stay at the top of the viewport").toBeLessThanOrEqual(1);
    expect(box?.height ?? 0, "Sign in tap target height").toBeGreaterThanOrEqual(40);
  });
});

test.describe("signed-in screens on a phone", () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "Set E2E_EMAIL and E2E_PASSWORD to run signed-in mobile checks.");
  test.setTimeout(240_000);

  const routes = ["/dashboard", "/learn", "/exam-sim", "/focus", "/timetable", "/analytics", "/subjects", "/tasks", "/settings"];

  test("main screens fit the viewport, show the bottom nav, and keep the floating Cortex pill off phones", async ({ page }) => {
    const errors = collectPageErrors(page);
    await signIn(page);
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForLoadState("networkidle").catch(() => undefined);
      await page.waitForTimeout(800);
      const o = await overflow(page);
      const nav = page.locator(".ssc-bottom-nav");
      const navVisible = await nav.first().isVisible().catch(() => false);
      const pillVisible = await page.getByRole("button", { name: "Open Ask Cortex" }).isVisible().catch(() => false);
      await page.screenshot({ path: `${OUT}/shots/app-${slug(route)}.png`, fullPage: true });
      metrics.push({ page: route, ...o, bottomNavVisible: navVisible, floatingCortexPillVisible: pillVisible });
      expect.soft(o.scrollWidth, `horizontal overflow on ${route}: ${o.offenders.join(" | ")}`).toBeLessThanOrEqual(o.innerWidth + 1);
      expect.soft(navVisible, `bottom navigation should be visible on ${route}`).toBe(true);
      expect.soft(pillVisible, `floating Ask Cortex pill should be hidden on phones (${route})`).toBe(false);
    }
    expect(errors, "uncaught page errors while browsing signed-in screens").toEqual([]);
  });

  test("timetable chips and controls are comfortable touch targets", async ({ page }) => {
    await signIn(page);
    await page.goto("/timetable");
    await page.waitForLoadState("networkidle").catch(() => undefined);
    const buttons = page.locator("button[aria-pressed]");
    const count = await buttons.count();
    const heights: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const b = await buttons.nth(i).boundingBox();
      if (b) heights.push(Math.round(b.height));
    }
    metrics.push({ page: "/timetable", chipCount: count, minChipHeight: Math.min(...heights, 999) });
    expect(count, "timetable chips found").toBeGreaterThan(0);
    expect(Math.min(...heights), "smallest chip height (px)").toBeGreaterThanOrEqual(38);
  });
});
