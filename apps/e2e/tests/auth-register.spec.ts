import { test, expect } from "./utils/test-base";
import { faker } from "@faker-js/faker";
import { config } from "./utils/config";

test.describe("Auth — Registration", () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.goto();
  });

  test("R-1: Successful registration", async ({
    page,
    request,
    registerPage,
    dashboardPage,
    cleanup,
  }) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email().toLowerCase();
    const password = faker.internet.password({ length: 12 }) + "!A1";

    await registerPage.register(firstName, lastName, email, password);

    // Should redirect to dashboard
    await page.waitForURL("/dashboard");
    await dashboardPage.isLoaded();
    await expect(dashboardPage.heading).toBeVisible();

    // Track for cleanup
    const loginRes = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: { email, password },
    });
    if (loginRes.ok()) {
      const { id } = await loginRes.json();
      cleanup.addUser(id);
    }
  });

  test("R-2: Duplicate email", async ({
    request,
    page,
    registerPage,
    cleanup,
  }) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email().toLowerCase();
    const password = faker.internet.password({ length: 12 }) + "!A1";

    // Seed the user via API first
    const res = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: { role: "patient", firstName, lastName, email, password },
    });
    if (res.ok()) {
      const { id } = await res.json();
      cleanup.addUser(id);
    }

    // Try to register with same email
    await registerPage.register(
      faker.person.firstName(),
      faker.person.lastName(),
      email,
      password
    );

    await expect(registerPage.errorMessage).toBeVisible();
    await expect(registerPage.errorMessage).toContainText(
      /already registered/i
    );
    // Should stay on the same page
    expect(page.url()).toContain("/register");
  });

  test("R-3: Invalid email format", async ({ page, registerPage }) => {
    const password = faker.internet.password({ length: 12 }) + "!A1";
    await registerPage.register("John", "Doe", "notanemail", password);

    // Check validation error inline
    await expect(page.getByTestId("email-error")).toBeVisible();
    await expect(page.getByTestId("email-error")).toContainText(
      /invalid email/i
    );
  });

  test("R-4: Password too short", async ({ page, registerPage }) => {
    const email = faker.internet.email().toLowerCase();
    await registerPage.register("John", "Doe", email, "short");

    // Check validation error inline
    await expect(page.getByTestId("password-error")).toBeVisible();
    await expect(page.getByTestId("password-error")).toContainText(
      /at least 6 characters/i
    );
  });

  test("R-5: Empty form submit", async ({ registerPage }) => {
    await registerPage.submitButton.click();

    // Should see multiple errors
    const errors = registerPage.page.locator("p.text-destructive");
    expect(await errors.count()).toBeGreaterThanOrEqual(2);
  });

  test("R-6: Already logged in visits /register", async ({
    page,
    request,
    registerPage,
    cleanup,
  }) => {
    // First we register and get logged in
    const email = faker.internet.email().toLowerCase();
    const password = faker.internet.password({ length: 12 }) + "!A1";

    await registerPage.register("John", "Doe", email, password);
    await page.waitForURL("/dashboard");

    // Track for cleanup
    const loginRes = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: { email, password },
    });
    if (loginRes.ok()) {
      const { id } = await loginRes.json();
      cleanup.addUser(id);
    }

    // Try visiting register again
    await registerPage.goto();

    // Should immediately bounce back to dashboard
    await page.waitForURL("/dashboard");
  });
});
