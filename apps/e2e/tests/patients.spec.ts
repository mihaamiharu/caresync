import { test, expect } from "./utils/test-base";
import { faker } from "@faker-js/faker";
import { config } from "./utils/config";

// ─── Admin patients list ───────────────────────────────────────────────────────

test.describe("Patients List — admin view", () => {
  test.beforeEach(async ({ page, loginPage }) => {
    test.skip(
      !config.adminEmail,
      "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars to run admin tests"
    );

    await loginPage.goto();
    await loginPage.login(config.adminEmail, config.adminPassword);
    await page.waitForURL("/dashboard");
  });

  test("PAT-1: Admin can navigate to /patients via sidebar", async ({
    page,
    patientsPage,
  }) => {
    await page.getByTestId("nav-patients").click();
    await page.waitForURL("/patients");
    await patientsPage.isLoaded();
    await expect(
      page.getByRole("heading", { name: /patients/i })
    ).toBeVisible();
  });

  test("PAT-2: /patients page renders search and filter controls", async ({
    patientsPage,
  }) => {
    await patientsPage.goto();
    await patientsPage.isLoaded();

    await expect(patientsPage.searchInput).toBeVisible();
    await expect(patientsPage.genderFilter).toBeVisible();
    await expect(patientsPage.bloodTypeFilter).toBeVisible();
  });

  test("PAT-3: Patients list shows registered patients", async ({
    request,
    cleanup,
    patientsPage,
  }) => {
    // Register a fresh patient so we know at least one exists
    const patient = {
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password({ length: 12 }) + "A!",
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };
    const regRes = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: { role: "patient", ...patient },
    });
    const { user: created } = await regRes.json();
    cleanup.addUser(created.id);

    await patientsPage.goto();
    await patientsPage.isLoaded();

    // At least one row should exist
    await expect(patientsPage.emptyState).not.toBeVisible();
    await expect(patientsPage.paginationInfo).toBeVisible();
  });

  test("PAT-4: Search filters the list by patient name", async ({
    request,
    cleanup,
    page,
    patientsPage,
  }) => {
    const uniqueFirstName = `E2E${faker.string.alphanumeric(8)}`;
    const patient = {
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password({ length: 12 }) + "A!",
      firstName: uniqueFirstName,
      lastName: faker.person.lastName(),
    };
    const regRes = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: { role: "patient", ...patient },
    });
    const { user: created } = await regRes.json();
    cleanup.addUser(created.id);

    await patientsPage.goto();
    await patientsPage.isLoaded();

    // Wait for the search response to arrive before asserting
    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/v1/patients") && resp.status() === 200
      ),
      patientsPage.searchInput.fill(uniqueFirstName),
    ]);

    await expect(page.getByText(uniqueFirstName)).toBeVisible();
  });

  test("PAT-5: Gender filter dropdown contains all gender options", async ({
    patientsPage,
  }) => {
    await patientsPage.goto();
    await patientsPage.isLoaded();

    const options = await patientsPage.genderFilter
      .locator("option")
      .allTextContents();
    expect(options).toContain("Male");
    expect(options).toContain("Female");
    expect(options).toContain("Other");
  });

  test("PAT-6: Blood type filter dropdown contains all blood type options", async ({
    patientsPage,
  }) => {
    await patientsPage.goto();
    await patientsPage.isLoaded();

    const options = await patientsPage.bloodTypeFilter
      .locator("option")
      .allTextContents();
    for (const bt of ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]) {
      expect(options).toContain(bt);
    }
  });
});

// ─── Non-admin access ─────────────────────────────────────────────────────────

test.describe("Patients List — non-admin access", () => {
  test("PAT-7: Patients sidebar link is NOT visible for patient role", async ({
    page,
    request,
    loginPage,
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
    const { user: created } = await regRes.json();
    cleanup.addUser(created.id);

    await loginPage.goto();
    await loginPage.login(user.email, user.password);
    await page.waitForURL("/dashboard");

    await expect(page.getByTestId("nav-patients")).not.toBeVisible();
  });

  test("PAT-8: GET /patients returns 403 for patient role", async ({
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

    const res = await request.get(`${config.apiUrl}/api/v1/patients`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(403);
  });
});

// ─── Admin API tests ──────────────────────────────────────────────────────────

test.describe("Patients List — API (admin)", () => {
  test("PAT-A1: GET /patients returns paginated list for admin", async ({
    request,
  }) => {
    test.skip(
      !config.adminEmail,
      "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars to run admin tests"
    );

    const loginRes = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: { email: config.adminEmail, password: config.adminPassword },
    });
    const { accessToken } = await loginRes.json();

    const res = await request.get(`${config.apiUrl}/api/v1/patients`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      data: expect.any(Array),
      total: expect.any(Number),
      page: 1,
      limit: 20,
      totalPages: expect.any(Number),
    });
  });

  test("PAT-A2: GET /patients supports gender filter", async ({ request }) => {
    test.skip(
      !config.adminEmail,
      "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars to run admin tests"
    );

    const loginRes = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: { email: config.adminEmail, password: config.adminPassword },
    });
    const { accessToken } = await loginRes.json();

    const res = await request.get(
      `${config.apiUrl}/api/v1/patients?gender=male`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    // Every returned row must have gender=male (or none if empty)
    for (const patient of body.data) {
      expect(patient.gender).toBe("male");
    }
  });

  test("PAT-A3: GET /patients rejects invalid gender filter with 400", async ({
    request,
  }) => {
    test.skip(
      !config.adminEmail,
      "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars to run admin tests"
    );

    const loginRes = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: { email: config.adminEmail, password: config.adminPassword },
    });
    const { accessToken } = await loginRes.json();

    const res = await request.get(
      `${config.apiUrl}/api/v1/patients?gender=unknown`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    expect(res.status()).toBe(400);
  });
});
