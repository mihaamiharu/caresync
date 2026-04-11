import { type APIRequestContext, type Page } from "@playwright/test";
import { test, expect, CleanupHelper } from "./utils/test-base";
import { faker } from "@faker-js/faker";
import { config } from "./utils/config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function registerAndLogin(
  page: Page,
  request: APIRequestContext,
  loginPage: any,
  cleanupHelper?: CleanupHelper
) {
  const user = {
    email: faker.internet.email().toLowerCase(),
    password: faker.internet.password({ length: 12 }) + "A!",
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  };

  const response = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
    data: { role: "patient", ...user },
  });
  expect(response.ok()).toBeTruthy();
  const newUser = await response.json();
  if (cleanupHelper) {
    cleanupHelper.addUser(newUser.user?.id ?? newUser.id);
  }

  await loginPage.goto();
  await loginPage.login(user.email, user.password);
  await page.waitForURL("/dashboard");

  return user;
}

async function adminLogin(page: Page, loginPage: any) {
  await loginPage.goto();
  await loginPage.login(config.adminEmail, config.adminPassword);
  await page.waitForURL("/dashboard");
}

// ─── Patient / authenticated-user view ────────────────────────────────────────

test.describe("Departments — patient view", () => {
  test.beforeEach(async ({ page, request, loginPage, cleanup }) => {
    await registerAndLogin(page, request, loginPage, cleanup);
  });

  test("D-1: Navigate to /departments via URL", async ({
    page,
    departmentsPage,
  }) => {
    await departmentsPage.goto();
    await departmentsPage.isLoaded();
    await expect(
      page.getByRole("heading", { name: /^departments$/i, level: 1 })
    ).toBeVisible();
  });

  test("D-2: Page shows loading indicator then resolves", async ({
    page,
    departmentsPage,
  }) => {
    // Navigate but catch the loading state before data arrives
    await departmentsPage.goto();
    // Loading indicator appears briefly — wait for it to disappear
    await departmentsPage.waitForContent();
    // After loading, either the list or the empty state must be visible
    const hasContent =
      (await departmentsPage.emptyState.isVisible()) ||
      (await page.locator('[data-testid^="department-card-"]').count()) > 0;
    expect(hasContent).toBeTruthy();
  });

  test("D-3: Search input is visible and accepts text", async ({
    departmentsPage,
  }) => {
    await departmentsPage.goto();
    await departmentsPage.isLoaded();

    await expect(departmentsPage.searchInput).toBeVisible();
    await departmentsPage.searchInput.fill("cardio");
    await expect(departmentsPage.searchInput).toHaveValue("cardio");
  });

  test("D-4: Non-admin does NOT see the Create Department button", async ({
    departmentsPage,
  }) => {
    await departmentsPage.goto();
    await departmentsPage.isLoaded();
    await departmentsPage.waitForContent();

    await expect(departmentsPage.createButton).not.toBeVisible();
  });

  test("D-5: Unauthenticated user is redirected to /login", async ({
    page,
  }) => {
    // Clear auth by navigating to login and skipping auth flow
    await page.evaluate(() => localStorage.clear());
    await page.goto("/departments");
    await page.waitForURL("/login");
  });
});

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

test.describe("Departments — admin CRUD", () => {
  test.beforeEach(async ({ page, loginPage }) => {
    if (!config.adminEmail) {
      return;
    }
    await adminLogin(page, loginPage);
  });

  test("D-6: Admin sees the Create Department button", async ({
    departmentsPage,
  }) => {
    test.skip(
      !config.adminEmail,
      "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars or run Task 24 seed"
    );

    await departmentsPage.goto();
    await departmentsPage.isLoaded();
    await expect(departmentsPage.createButton).toBeVisible();
  });

  test("D-7: Admin can open the Create Department modal", async ({
    departmentsPage,
  }) => {
    test.skip(
      !config.adminEmail,
      "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars or run Task 24 seed"
    );

    await departmentsPage.goto();
    await departmentsPage.isLoaded();
    await departmentsPage.createButton.click();

    await expect(departmentsPage.formModal).toBeVisible();
    await expect(departmentsPage.nameInput).toBeVisible();
    await expect(departmentsPage.submitButton).toBeVisible();
  });

  test("D-8: Create Department modal validates — name is required", async ({
    departmentsPage,
  }) => {
    test.skip(
      !config.adminEmail,
      "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars or run Task 24 seed"
    );

    await departmentsPage.goto();
    await departmentsPage.isLoaded();
    await departmentsPage.createButton.click();

    // Submit without filling in the name
    await departmentsPage.submitButton.click();
    await expect(departmentsPage.nameError).toBeVisible();
    await expect(departmentsPage.nameError).toContainText(/required/i);
  });

  test("D-9: Admin can create a new department", async ({
    page,
    request,
    departmentsPage,
    cleanup,
  }) => {
    test.skip(
      !config.adminEmail,
      "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars or run Task 24 seed"
    );

    const deptName = `Test Dept ${faker.string.alphanumeric(6)}`;

    await departmentsPage.goto();
    await departmentsPage.isLoaded();
    await departmentsPage.createButton.click();
    await departmentsPage.fillAndSubmitForm(deptName, "Created by E2E test");

    // Modal closes
    await expect(departmentsPage.formModal).not.toBeVisible();

    // To fix flakiness with large amounts of data, use search to find the new department
    await departmentsPage.searchInput.fill(deptName);
    await departmentsPage.waitForContent();
    await expect(page.getByText(deptName)).toBeVisible();

    // Track for cleanup
    const loginRes = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: { email: config.adminEmail, password: config.adminPassword },
    });
    const { accessToken } = await loginRes.json();
    const deptListRes = await request.get(
      `${config.apiUrl}/api/v1/departments?search=${deptName}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const { data: deptsData } = await deptListRes.json();
    if (deptsData.length > 0) {
      cleanup.addDepartment(deptsData[0].id);
    }
  });

  test("D-10: Admin can edit an existing department", async ({
    page,
    request,
    departmentsPage,
    cleanup,
  }) => {
    test.skip(
      !config.adminEmail,
      "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars or run Task 24 seed"
    );

    // Seed a department via API so the test doesn't depend on prior test state
    const loginRes = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: { email: config.adminEmail, password: config.adminPassword },
    });
    const { accessToken } = await loginRes.json();

    const deptName = `E2E Edit ${faker.string.alphanumeric(6)}`;
    const createRes = await request.post(
      `${config.apiUrl}/api/v1/departments`,
      {
        data: { name: deptName, description: "Original" },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    cleanup.addDepartment(created.id);

    await departmentsPage.goto();
    await departmentsPage.isLoaded();
    await departmentsPage.waitForContent();

    // Search for the seeded department to handle pagination/data bloat
    await departmentsPage.searchInput.fill(deptName);
    await departmentsPage.editButton(created.id).waitFor({ state: "visible" });

    await departmentsPage.editButton(created.id).click();
    await expect(departmentsPage.formModal).toBeVisible();

    // Name input should be pre-filled
    await expect(departmentsPage.nameInput).toHaveValue(created.name);

    const updatedName = `Updated ${faker.string.alphanumeric(6)}`;
    await departmentsPage.nameInput.fill(updatedName);
    await departmentsPage.submitButton.click();

    await expect(departmentsPage.formModal).not.toBeVisible();

    // Search for updated name
    await departmentsPage.searchInput.fill(updatedName);
    await departmentsPage.waitForContent();
    await expect(page.getByText(updatedName)).toBeVisible();
  });

  test("D-11: Admin can delete a department", async ({
    page,
    request,
    departmentsPage,
    cleanup,
  }) => {
    test.skip(
      !config.adminEmail,
      "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars or run Task 24 seed"
    );

    // Seed a department via API
    const loginRes = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: { email: config.adminEmail, password: config.adminPassword },
    });
    const { accessToken } = await loginRes.json();

    const deptName = `E2E Delete ${faker.string.alphanumeric(6)}`;
    const createRes = await request.post(
      `${config.apiUrl}/api/v1/departments`,
      {
        data: { name: deptName },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    cleanup.addDepartment(created.id);

    await departmentsPage.goto();
    await departmentsPage.isLoaded();
    await departmentsPage.waitForContent();

    // Search for the seeded department
    await departmentsPage.searchInput.fill(deptName);
    await departmentsPage.card(created.id).waitFor({ state: "visible" });

    await expect(page.getByText(deptName)).toBeVisible();

    await departmentsPage.deleteButton(created.id).click();

    // Card should disappear
    await expect(page.getByText(deptName)).not.toBeVisible({ timeout: 5_000 });
  });

  test("D-12: Cancel button closes the form without saving", async ({
    departmentsPage,
  }) => {
    test.skip(
      !config.adminEmail,
      "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars or run Task 24 seed"
    );

    await departmentsPage.goto();
    await departmentsPage.isLoaded();
    await departmentsPage.createButton.click();

    await departmentsPage.nameInput.fill("Should not be saved");
    await departmentsPage.cancelButton.click();

    await expect(departmentsPage.formModal).not.toBeVisible();
    await expect(
      departmentsPage.page.getByText("Should not be saved")
    ).not.toBeVisible();
  });

  // ─── Admin API contract tests (no UI required) ─────────────────────────────

  test("D-API-1: Admin API — POST /departments returns 201", async ({
    request,
    cleanup,
  }) => {
    test.skip(
      !config.adminEmail,
      "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars or run Task 24 seed"
    );

    const loginRes = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: { email: config.adminEmail, password: config.adminPassword },
    });
    const { accessToken } = await loginRes.json();

    const res = await request.post(`${config.apiUrl}/api/v1/departments`, {
      data: {
        name: `API Test ${faker.string.alphanumeric(6)}`,
        description: "API contract test",
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ name: expect.any(String), isActive: true });
    cleanup.addDepartment(body.id);
  });

  test("D-API-2: Non-admin API — POST /departments returns 403", async ({
    request,
    cleanup,
  }) => {
    // Register a fresh patient and try to hit the admin endpoint
    const regRes = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: {
        role: "patient",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email().toLowerCase(),
        password: faker.internet.password({ length: 12 }) + "A!",
      },
    });
    const { id, accessToken } = await regRes.json();
    cleanup.addUser(id);

    const res = await request.post(`${config.apiUrl}/api/v1/departments`, {
      data: { name: "Should fail" },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(403);
  });

  test("D-API-3: Unauthenticated GET /departments returns 401", async ({
    request,
  }) => {
    const res = await request.get(`${config.apiUrl}/api/v1/departments`);
    expect(res.status()).toBe(401);
  });

  test("D-API-4: Authenticated GET /departments returns paginated list", async ({
    request,
    cleanup,
  }) => {
    const regRes = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: {
        role: "patient",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email().toLowerCase(),
        password: faker.internet.password({ length: 12 }) + "A!",
      },
    });
    const { id, accessToken } = await regRes.json();
    cleanup.addUser(id);

    const res = await request.get(`${config.apiUrl}/api/v1/departments`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      data: expect.any(Array),
      total: expect.any(Number),
      page: expect.any(Number),
      limit: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });
});
