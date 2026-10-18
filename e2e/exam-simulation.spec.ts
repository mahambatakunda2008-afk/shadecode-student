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
    await expect(page.getByText("Question 1 of 5")).toBeVisible({ timeout: 15_000 });

    for (let index = 1; index <= 5; index += 1) {
      const answer = page.getByLabel(`Answer for question ${index}`);
      await expect(answer).toBeVisible();
      await answer.fill(`Acceptance test answer for question ${index}. Show the relevant method and conclusion.`);

      if (index < 5) {
        await page.getByRole("button", { name: "Next" }).click();
        await expect(page.getByText(`Question ${index + 1} of 5`)).toBeVisible();
      }
    }

    await page.getByRole("button", { name: "Review & submit" }).last().click();
    await page.getByRole("button", { name: "Submit for marking" }).click();

    await expect(page.getByRole("heading", { name: "Your paper has been marked." })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("tab", { name: "Topic overview" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Review questions" })).toBeVisible();

    const resultQuestionCount = await page.locator('[role="tabpanel"][aria-label="Topic overview"]').count();
    expect(resultQuestionCount).toBeGreaterThan(0);
    await page.screenshot({ path: "test-results/exam-simulation-results.png", fullPage: true });
  });
});
