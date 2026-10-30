import { test } from "@playwright/test";
import fs from "node:fs";

/**
 * Records the computed page-level styles (html/body) in dark and light mode, plus how many emotion <style> tags exist.
 * Used to prove that a global-style change (e.g. removing MUI's CssBaseline) is visually equivalent.
 * Output goes to mobile-metrics/style-probe.json and is surfaced by CI as annotations.
 */
const OUT = "mobile-metrics";
const results: Record<string, unknown>[] = [];

test.afterAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(`${OUT}/style-probe.json`, JSON.stringify(results, null, 2));
});

for (const scheme of ["dark", "light"] as const) {
  test(`page-level computed styles (${scheme})`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 360, height: 740 }, baseURL });
    const page = await context.newPage();
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const styles = await page.evaluate(() => {
      const pick = (el: Element, props: string[]) => {
        const cs = getComputedStyle(el);
        return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
      };
      return {
        htmlClass: document.documentElement.className,
        htmlDataTheme: document.documentElement.getAttribute("data-theme"),
        html: pick(document.documentElement, ["color-scheme", "box-sizing", "-webkit-font-smoothing", "-webkit-text-size-adjust", "background-color"]),
        body: pick(document.body, ["background-color", "color", "font-family", "font-size", "font-weight", "line-height", "margin", "box-sizing", "-webkit-font-smoothing"]),
        heading: document.querySelector("h1") ? pick(document.querySelector("h1")!, ["font-family", "font-size", "font-weight", "letter-spacing", "margin"]) : null,
        emotionStyleTags: document.querySelectorAll("style[data-emotion]").length,
        styleTags: document.querySelectorAll("style").length,
      };
    });
    results.push({ page: `probe-${scheme}`, ...styles });
    await context.close();
  });
}
