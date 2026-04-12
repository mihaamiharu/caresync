import { test, expect } from "./utils/test-base";
import { faker } from "@faker-js/faker";
import { config } from "./utils/config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function registerPatientAndLogin(
  request: any,
  page: any,
  loginPage: any,
  cleanup: any
) {
  const user = {
    email: faker.internet.email().toLowerCase(),
    password: faker.internet.password({ length: 12 }) + "A!",
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  };

  const res = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
    data: { role: "patient", ...user },
  });
  expect(res.ok()).toBeTruthy();
  const { user: created } = await res.json();
  cleanup.addUser(created.id);

  await loginPage.goto();
  await loginPage.login(user.email, user.password);
  await page.waitForURL("/dashboard");

  return { user, userId: created.id };
}

// ─── Medical Information section (patient) ───────────────────────────────────

test.describe("Patient Medical Profile", () => {
  test.beforeEach(async ({ page, request, loginPage, cleanup }) => {
    await registerPatientAndLogin(request, page, loginPage, cleanup);
    await page.goto("/profile");
  });

  test("PP-1: Medical Information section is visible for patients", async ({
    profilePage,
  }) => {
    await profilePage.isLoaded();
    await expect(profilePage.medicalInfoSection).toBeVisible();
  });

  test("PP-2: All medical fields are present", async ({ profilePage }) => {
    await profilePage.isLoaded();
    await expect(profilePage.dobInput).toBeVisible();
    await expect(profilePage.genderSelect).toBeVisible();
    await expect(profilePage.bloodTypeSelect).toBeVisible();
    await expect(profilePage.allergiesInput).toBeVisible();
    await expect(profilePage.emergencyContactNameInput).toBeVisible();
    await expect(profilePage.emergencyContactPhoneInput).toBeVisible();
    await expect(profilePage.saveMedicalButton).toBeVisible();
  });

  test("PP-3: Saving medical info shows success message", async ({
    profilePage,
  }) => {
    await profilePage.isLoaded();

    await profilePage.dobInput.fill("1990-05-15");
    await profilePage.genderSelect.selectOption("male");
    await profilePage.bloodTypeSelect.selectOption("A+");
    await profilePage.allergiesInput.fill("penicillin");
    await profilePage.emergencyContactNameInput.fill("Jane Doe");
    await profilePage.emergencyContactPhoneInput.fill("+1234567890");

    await profilePage.saveMedicalButton.click();

    await expect(profilePage.medicalSuccessMessage).toBeVisible();
    await expect(profilePage.medicalSuccessMessage).toContainText(
      /updated successfully/i
    );
  });

  test("PP-4: Saved medical data persists after page reload", async ({
    page,
    profilePage,
  }) => {
    await profilePage.isLoaded();

    await profilePage.dobInput.fill("1985-11-22");
    await profilePage.genderSelect.selectOption("female");
    await profilePage.bloodTypeSelect.selectOption("O-");
    await profilePage.allergiesInput.fill("latex");
    await profilePage.saveMedicalButton.click();
    await expect(profilePage.medicalSuccessMessage).toBeVisible();

    await page.reload();
    await profilePage.isLoaded();

    await expect(profilePage.dobInput).toHaveValue("1985-11-22");
    await expect(profilePage.genderSelect).toHaveValue("female");
    await expect(profilePage.bloodTypeSelect).toHaveValue("O-");
    await expect(profilePage.allergiesInput).toHaveValue("latex");
  });

  test("PP-5: Medical info fields start empty for a new patient", async ({
    profilePage,
  }) => {
    await profilePage.isLoaded();

    await expect(profilePage.dobInput).toHaveValue("");
    await expect(profilePage.genderSelect).toHaveValue("");
    await expect(profilePage.bloodTypeSelect).toHaveValue("");
    await expect(profilePage.allergiesInput).toHaveValue("");
  });
});

// ─── Non-patient role: medical section hidden ─────────────────────────────────

test.describe("Patient Medical Profile — admin role", () => {
  test("PP-6: Medical Information section is NOT visible for admin", async ({
    page,
    profilePage,
    loginPage,
  }) => {
    test.skip(
      !config.adminEmail,
      "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars to run admin tests"
    );

    await loginPage.goto();
    await loginPage.login(config.adminEmail, config.adminPassword);
    await page.waitForURL("/dashboard");
    await page.goto("/profile");
    await profilePage.isLoaded();

    await expect(profilePage.medicalInfoSection).not.toBeVisible();
  });
});

// ─── API-level tests ──────────────────────────────────────────────────────────

test.describe("Patient Profile — API", () => {
  test("PP-A1: GET /patients/me returns empty record for a new patient", async ({
    request,
    cleanup,
  }) => {
    const user = {
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password({ length: 12 }) + "A!",
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    const regRes = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: { role: "patient", ...user },
    });
    const { accessToken, user: created } = await regRes.json();
    cleanup.addUser(created.id);

    const res = await request.get(`${config.apiUrl}/api/v1/patients/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    // Registration auto-creates a patient row; all clinical fields start null
    expect(body).toMatchObject({
      dateOfBirth: null,
      gender: null,
      bloodType: null,
      allergies: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
    });
  });

  test("PP-A2: PUT /patients/me upserts patient data", async ({
    request,
    cleanup,
  }) => {
    const user = {
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password({ length: 12 }) + "A!",
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    const regRes = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: { role: "patient", ...user },
    });
    const { accessToken, user: created } = await regRes.json();
    cleanup.addUser(created.id);

    const putRes = await request.put(`${config.apiUrl}/api/v1/patients/me`, {
      data: {
        dateOfBirth: "1990-05-15",
        gender: "male",
        bloodType: "A+",
        allergies: "penicillin",
        emergencyContactName: "Jane Doe",
        emergencyContactPhone: "+1234567890",
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(putRes.status()).toBe(200);
    const body = await putRes.json();
    expect(body.dateOfBirth).toBe("1990-05-15");
    expect(body.gender).toBe("male");
    expect(body.bloodType).toBe("A+");
  });

  test("PP-A3: PUT /patients/me rejects an invalid blood type", async ({
    request,
    cleanup,
  }) => {
    const user = {
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password({ length: 12 }) + "A!",
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    const regRes = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: { role: "patient", ...user },
    });
    const { accessToken, user: created } = await regRes.json();
    cleanup.addUser(created.id);

    const res = await request.put(`${config.apiUrl}/api/v1/patients/me`, {
      data: { bloodType: "X+" },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(400);
  });

  test("PP-A4: PUT /patients/me rejects a future date of birth", async ({
    request,
    cleanup,
  }) => {
    const user = {
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password({ length: 12 }) + "A!",
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    const regRes = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: { role: "patient", ...user },
    });
    const { accessToken, user: created } = await regRes.json();
    cleanup.addUser(created.id);

    const res = await request.put(`${config.apiUrl}/api/v1/patients/me`, {
      data: { dateOfBirth: "2099-01-01" },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(400);
  });
});
