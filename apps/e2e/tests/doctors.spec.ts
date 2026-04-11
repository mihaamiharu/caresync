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
    cleanupHelper.addUser(newUser.id);
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

test.describe("Doctors — patient view", () => {
  test.beforeEach(async ({ page, request, loginPage, cleanup }) => {
    await registerAndLogin(page, request, loginPage, cleanup);
  });

  test("DOC-1: Navigate to /doctors via URL", async ({ page, doctorsPage }) => {
    await doctorsPage.goto();
    await doctorsPage.isLoaded();
    await expect(
      page.getByRole("heading", { name: /^doctors$/i, level: 1 })
    ).toBeVisible();
  });

  test("DOC-2: Non-admin does NOT see the Create Doctor button", async ({
    doctorsPage,
  }) => {
    await doctorsPage.goto();
    await doctorsPage.isLoaded();
    await doctorsPage.waitForContent();

    await expect(doctorsPage.createButton).not.toBeVisible();
  });
});

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

test.describe("Doctors — admin CRUD", () => {
  test.beforeEach(async ({ page, loginPage }) => {
    if (!config.adminEmail) {
      return;
    }
    await adminLogin(page, loginPage);
  });

  test("DOC-3: Admin can create a new doctor", async ({
    page,
    request,
    doctorsPage,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    // 1. Need a department first
    const loginRes = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: { email: config.adminEmail, password: config.adminPassword },
    });
    const { accessToken } = await loginRes.json();

    const deptName = `Doc Dept ${faker.string.alphanumeric(6)}`;
    const deptRes = await request.post(`${config.apiUrl}/api/v1/departments`, {
      data: { name: deptName },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const dept = await deptRes.json();
    cleanup.addDepartment(dept.id);

    const doctorData = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      password: "Password123!",
      departmentId: dept.id,
      specialization: "E2E Testing",
      licenseNumber: faker.string.alphanumeric(10).toUpperCase(),
    };

    await doctorsPage.goto();
    await doctorsPage.isLoaded();
    await doctorsPage.createButton.click();

    // Wait for the department to be available in the select
    await expect(
      page.locator(
        `select[data-testid="doctor-department-input"] option[value="${doctorData.departmentId}"]`
      )
    ).toBeAttached();

    await doctorsPage.fillAndSubmitForm(doctorData);
    await expect(doctorsPage.formModal).not.toBeVisible();

    // Check for the doctor's name in a way that handles special characters
    const fullName = `Dr. ${doctorData.firstName} ${doctorData.lastName}`;
    const doctorCard = page.locator("h3", { hasText: fullName });
    await expect(doctorCard).toBeVisible();

    const doctorsListRes = await request.get(
      `${config.apiUrl}/api/v1/doctors?search=${doctorData.email}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const { data: doctorsData } = await doctorsListRes.json();
    if (doctorsData.length > 0) {
      cleanup.addDoctor(doctorsData[0].id);
    }
  });
});
