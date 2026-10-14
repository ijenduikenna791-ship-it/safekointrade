import { test, expect } from "@playwright/test";

// Skip the startup animation so assertions don't wait on it.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem("mv-splash-seen", "1");
    } catch {}
  });
});

test("home page renders the hero and risk warning", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("footer")).toContainText(/financial advice/i);
});

test("Arabic is right-to-left", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
});

test("dashboard redirects anonymous visitors to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("admin redirects anonymous visitors to staff login", async ({ page }) => {
  await page.goto("/admin/deposits");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("there is no public admin registration route", async ({ page }) => {
  await page.goto("/admin/register");
  // Lands on staff sign-in; no sign-up form and no link to create staff accounts.
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByLabel(/confirm password/i)).toHaveCount(0);
});

test("unknown pages return 404", async ({ page }) => {
  const res = await page.goto("/fr/this-page-does-not-exist");
  expect(res.status()).toBe(404);
});

test("registration form validates before submitting", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel(/^email/i).fill("not-an-email");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page.getByText(/valid email/i).first()).toBeVisible();
});
