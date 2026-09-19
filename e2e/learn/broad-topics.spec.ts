import { test, expect } from "@playwright/test";
import { signIn } from "./auth";

const cases = (process.env.E2E_LEARN_TOPICS || "Organic Chemistry").split(",").map((topic) => topic.trim()).filter(Boolean);
const subject = process.env.E2E_LEARN_SUBJECT || "Chemistry";

test.describe("Learn deep-generation browser contract", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/learn");
    await expect(page.getByRole("heading", { name: "Learn with intent." })).toBeVisible();
  });

  for (const topic of cases) {
    test(`builds and renders a substantive lesson for: ${topic}`, async ({ page }) => {
      await page.getByLabel("Subject").selectOption({ label: subject });
      await page.getByLabel("What do you need help with?").fill(topic);
      await page.getByRole("button", { name: "Start learning" }).click();

      await expect(page).toHaveURL(/\/learn\/[^/]+$/, { timeout: 120_000 });
      await expect(page.locator("h1.lesson-title")).toBeVisible({ timeout: 15_000 });

      const units = page.locator(".lesson-unit");
      await expect(units).toHaveCount(16, { timeout: 10_000 }).catch(async () => {
        const count = await units.count();
        throw new Error(`Deep lesson contract failed: expected at least 16 rendered lesson units, got ${count} for "${topic}".`);
      });

      const unitCount = await units.count();
      expect(unitCount).toBeGreaterThanOrEqual(16);

      const unitLengths = await units.evaluateAll((elements) =>
        elements.map((element) => (element.textContent || "").trim().length)
      );
      const substantive = unitLengths.filter((length) => length >= 100).length;
      expect(substantive).toBeGreaterThanOrEqual(10);

      const body = (await page.locator("main").innerText()).toLowerCase();
      for (const required of [
        "the big picture",
        "structure and patterns",
        "how it works",
        "worked example",
        "put it together",
        "go deeper",
        "practice",
      ]) {
        expect(body, `Missing deep-learning section: ${required}`).toContain(required);
      }

      expect(body).not.toContain("no content yet");
      expect(body.length).toBeGreaterThan(3500);

      await page.screenshot({
        path: `test-results/learn-${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`,
        fullPage: true,
      });
    });
  }
});
