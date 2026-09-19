import { expect, type Page } from "@playwright/test";

export async function signIn(page: Page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error("Set E2E_EMAIL and E2E_PASSWORD before running Learn browser tests.");
  }

  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard|\/onboarding/, { timeout: 20_000 });
  if (page.url().includes("/onboarding")) {
    throw new Error("The E2E account has not completed onboarding. Use an existing test/student account.");
  }
}
