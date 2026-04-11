import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { faker } from "@faker-js/faker";
import { LoginPage } from "./poms/LoginPage";
import { DoctorsPage } from "./poms/DoctorsPage";
import { config } from "./utils/config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function registerAndLogin(page: Page, request: APIRequestContext) {
  const loginPage = new LoginPage(page);
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

  await loginPage.goto();
  await loginPage.login(user.email, user.password);
  await page.waitForURL("/dashboard");

  return user;
}

async function adminLogin(page: Page) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(config.adminEmail, config.adminPassword);
  await page.waitForURL("/dashboard");
}

// ─── Patient / authenticated-user view ────────────────────────────────────────

test.describe("Doctors — patient view", () => {
  let doctorsPage: DoctorsPage;

  test.beforeEach(async ({ page, request }) => {
    doctorsPage = new DoctorsPage(page);
    await registerAndLogin(page, request);
  });

  test("DOC-1: Navigate to /doctors via URL", async ({ page }) => {
    await doctorsPage.goto();
    await doctorsPage.isLoaded();
    await expect(
      page.getByRole("heading", { name: /^doctors$/i, level: 1 })
    ).toBeVisible();
  });

  test("DOC-2: Non-admin does NOT see the Create Doctor button", async () => {
    await doctorsPage.goto();
    await doctorsPage.isLoaded();
    await doctorsPage.waitForContent();

    await expect(doctorsPage.createButton).not.toBeVisible();
  });
});

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

test.describe("Doctors — admin CRUD", () => {
  let doctorsPage: DoctorsPage;

  test.beforeEach(async ({ page }) => {
    doctorsPage = new DoctorsPage(page);

    if (!config.adminEmail) {
      return;
    }

    await adminLogin(page);
  });

  test("DOC-3: Admin can create a new doctor", async ({ page, request }) => {
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
    await doctorsPage.fillAndSubmitForm(doctorData);

    // Modal closes and new card appears
    if (await doctorsPage.formModal.isVisible()) {
      const error = await doctorsPage.formError.innerText().catch(() => "No visible error");
      console.error(`Form submission failed with error: ${error}`);
    }
    
    await expect(doctorsPage.formModal).not.toBeVisible();
    await expect(
      page.getByText(`Dr. ${doctorData.firstName} ${doctorData.lastName}`)
    ).toBeVisible();
  });
});
