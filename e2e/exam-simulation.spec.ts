import { test, expect } from "@playwright/test";
import { signIn } from "./learn/auth";

const subject = (process.env.E2E_EXAM_SUBJECT || "").trim();
const topic = (process.env.E2E_EXAM_TOPIC || "").trim();

test.describe("Exam Simulation acceptance journey", () => {
  test.skip(!subject, "Set E2E_EXAM_SUBJECT to a subject selected on the signed-in test account.");
  test.setTimeout(180_000);

  test("generates a paper, saves answers, marks it, and renders results", async ({ page }) => {
    await signIn(page);
    await page.goto("/exam-sim");

    await expect(page.getByRole("heading", { name: "Build your exam room." })).toBeVisible({ timeout: 20_000 });

    const subjectSelect = page.getByLabel("Subject");
    await expect(subjectSelect).toBeVisible();
    await subjectSelect.selectOption({ label: subject });

    if (topic) {
      await page.getByPlaceholder("e.g. mechanics, calculus, organic chemistry").fill(topic);
    }

    // Use the smallest supported paper to keep the acceptance test quick and inexpensive.
    await page.getByRole("button", { name: "5", exact: true }).click();
    await page.getByRole("button", { name: /Enter exam room/i }).click();

    // Either a live-generated paper or an explicitly labelled deterministic fallback is acceptable.
    await expect(page.getByText(/Paper 1 · 5 questions/)).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('[id^="question-heading-"]')).toContainText("Question 1 of 5", { timeout: 15_000 });

    for (let index = 1; index <= 5; index += 1) {
      const answer = page.getByLabel(`Answer for question ${index}`);
      await expect(answer).toBeVisible();
      await answer.fill(`Acceptance test answer for question ${index}. Show the relevant method and conclusion.`);

      if (index === 1) {
        // Verify that an in-progress attempt survives a full page reload, not just component navigation.
        await page.getByRole("button", { name: "Next" }).click();
        await expect(page.locator('[id^="question-heading-"]')).toContainText("Question 2 of 5");
        await expect.poll(() => page.evaluate(() => {
          const key = Object.keys(localStorage).find((candidate) => candidate.startsWith("shadecode-exam-workspace:"));
          const raw = key ? localStorage.getItem(key) : null;
          return Boolean(raw && raw.includes("Acceptance test answer for question 1.") && raw.includes('"current":1'));
        }), { timeout: 15_000 }).toBe(true);

        await page.reload();
        await expect(page.getByRole("heading", { name: "Build your exam room." })).toBeVisible({ timeout: 20_000 });
        await expect(page.getByText("Unfinished exam saved")).toBeVisible({ timeout: 15_000 });
        await page.getByRole("button", { name: "Resume" }).click();
        await expect(page.locator('[id^="question-heading-"]')).toContainText("Question 2 of 5", { timeout: 15_000 });

        await page.getByRole("button", { name: /Question 1:/ }).click();
        await expect(page.getByLabel("Answer for question 1")).toHaveValue("Acceptance test answer for question 1. Show the relevant method and conclusion.");
        await page.getByRole("button", { name: "Next" }).click();
        await expect(page.locator('[id^="question-heading-"]')).toContainText("Question 2 of 5");
      } else if (index < 5) {
        await page.getByRole("button", { name: "Next" }).click();
        await expect(page.locator('[id^="question-heading-"]')).toContainText(`Question ${index + 1} of 5`);
      }
    }

    await page.getByRole("button", { name: "Review & submit" }).last().click();
    await page.getByRole("button", { name: "Submit for marking" }).click();

    await expect(page.getByRole("heading", { name: "Your paper has been marked." })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("tab", { name: "Topic overview" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Review questions" })).toBeVisible();

    const topicOverview = page.getByRole("tabpanel", { name: "Topic overview" });
    await expect(topicOverview).toBeVisible();
    await expect.poll(() => topicOverview.innerText().then(text => text.trim().length), { timeout: 15_000 }).toBeGreaterThan(20);

    await page.getByRole("tab", { name: "Review questions" }).click();
    const questionReview = page.getByRole("tabpanel", { name: "Review questions" });
    await expect(questionReview).toBeVisible();
    await expect.poll(() => questionReview.innerText().then(text => text.trim().length), { timeout: 15_000 }).toBeGreaterThan(100);

    await page.screenshot({ path: "test-results/exam-simulation-results.png", fullPage: true });
  });
});
