import { test, expect } from "@playwright/test";
import { signIn } from "./auth";

const requestedSubject = (process.env.E2E_LEARN_SUBJECT || "").trim();
const requestedTopic = (process.env.E2E_LEARN_TOPICS || "").split(",").map((topic) => topic.trim()).filter(Boolean)[0] || "";

test.describe("Learn deep-generation browser contract", () => {
  test.setTimeout(150_000);
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    const learnLogs: string[] = [];
      page.on("console", (message) => {
        const text = message.text();
        if (text.includes("[LEARN]") || text.includes("[Cortex")) learnLogs.push(text.slice(0, 400));
      });
      await page.goto("/learn");
    await expect(page.getByRole("heading", { name: /Make the hard stuff/ })).toBeVisible();
  });

  test("builds and renders a substantive lesson from the signed-in user curriculum", async ({ page }) => {
      const subjectSelect = page.locator("#learn-subject");
      await expect(subjectSelect).toBeVisible({ timeout: 15_000 });
      await expect.poll(async () => subjectSelect.locator("option").count(), { timeout: 15_000 }).toBeGreaterThan(1);

      const options = await subjectSelect.locator("option").evaluateAll((elements) =>
        elements.map((element) => ({ value: (element as HTMLOptionElement).value, label: (element.textContent || "").trim() }))
          .filter((option) => option.value && option.label)
      );
      const selected = requestedSubject
        ? options.find((option) => option.label.toLowerCase() === requestedSubject.toLowerCase())
        : options[0];
      expect(selected, requestedSubject ? `Subject "${requestedSubject}" is not available in this user's Learn subjects. Available: ${options.map((option) => option.label).join(" | ")}` : "No usable Learn subject was available.").toBeTruthy();
      await subjectSelect.selectOption({ value: selected!.value });
      expect(requestedTopic, "E2E_LEARN_TOPICS must name a real broad topic from the signed-in user curriculum; no synthetic fallback is allowed.").toBeTruthy();
      const topic = requestedTopic;
      const aiSwitch = page.getByRole("switch", { name: "Enable Cortex AI" });
      await expect(aiSwitch).toBeVisible({ timeout: 10_000 });
      if ((await aiSwitch.getAttribute("aria-checked")) !== "true") await aiSwitch.click();
      await expect(aiSwitch).toHaveAttribute("aria-checked", "true");
      await page.locator("#learn-topic").fill(topic);
      await page.getByRole("button", { name: /Start learning/ }).click();

      await expect.poll(async () => {
        // A successful generation navigates to /learn/<id>, which destroys the evaluate context mid-poll.
        if (/\/learn\/[^/?#]+$/.test(new URL(page.url()).pathname)) return "navigated";
        try {
          return await page.evaluate(() => {
        if (/\/learn\/[^/]+$/.test(window.location.pathname)) return "navigated";
        try {
          const raw = localStorage.getItem("shadecode:cortex:generation-jobs:v2");
          const jobs = raw ? JSON.parse(raw) : [];
          const latest = Array.isArray(jobs) ? [...jobs].reverse().find((job: { kind?: string }) => job?.kind === "lesson") : null;
          if (latest?.status === "failed") return `failed: ${latest.error || "unknown generation error"}`;
          if (latest?.status === "complete") return "complete";
          return latest?.status || "waiting";
        } catch {
          return "waiting";
        }
      })
        } catch {
          return "navigated";
        }
      }, { timeout: 130_000, intervals: [1000] }).toMatch(/^(navigated|complete)$/);
      await expect(page.locator("h1.lesson-title")).toBeVisible({ timeout: 15_000 });
      // The app opens the lesson shell immediately ("Cortex is building ...") and fills it in section by
      // section from the browser, so wait for the finished lesson before judging its content.
      try {
        await expect.poll(async () => {
          const text = (await page.locator("main").innerText()).toLowerCase();
          return text.includes("cortex is building") ? "building" : "built";
        }, { timeout: 140_000, intervals: [2000], message: "Lesson never finished building" }).toBe("built");
      } catch (error) {
        const finalText = (await page.locator("main").innerText().catch(() => "")).slice(0, 300).replace(/\s+/g, " ");
        throw new Error(`${error instanceof Error ? error.message : String(error)}\nPage: ${finalText}\nBrowser logs:\n${learnLogs.slice(-25).join("\n")}`);
      }

      const units = page.locator(".lesson-unit");
      await expect.poll(async () => units.count(), { timeout: 15_000 }).toBeGreaterThanOrEqual(16);

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
});
