import { type APIRequestContext, type Page } from "@playwright/test";
import { test, expect, CleanupHelper } from "./utils/test-base";
import { faker } from "@faker-js/faker";
import { config } from "./utils/config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the next Monday date in YYYY-MM-DD format (always in the future). */
function getNextMonday(): string {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, …
  const daysToAdd = day === 1 ? 7 : (8 - day) % 7;
  d.setUTCDate(d.getUTCDate() + daysToAdd);
  return d.toISOString().split("T")[0];
}

async function getAdminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
    data: { email: config.adminEmail, password: config.adminPassword },
  });
  const { accessToken } = await res.json();
  return accessToken;
}

async function createDeptAndDoctor(
  request: APIRequestContext,
  token: string,
  cleanup: CleanupHelper
) {
  const deptRes = await request.post(`${config.apiUrl}/api/v1/departments`, {
    data: { name: `Schedule Dept ${faker.string.alphanumeric(6)}` },
    headers: { Authorization: `Bearer ${token}` },
  });
  const dept = await deptRes.json();
  cleanup.addDepartment(dept.id);

  const doctorData = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    password: "Password123!",
    departmentId: dept.id,
    specialization: "Schedule Testing",
    licenseNumber: faker.string.alphanumeric(10).toUpperCase(),
  };

  const doctorRes = await request.post(`${config.apiUrl}/api/v1/doctors`, {
    data: doctorData,
    headers: { Authorization: `Bearer ${token}` },
  });
  const doctor = await doctorRes.json();
  cleanup.addDoctor(doctor.id);

  return { doctor, doctorData };
}

async function loginAs(
  page: Page,
  loginPage: any,
  email: string,
  password: string
) {
  await loginPage.goto();
  await loginPage.login(email, password);
  await page.waitForURL("/dashboard");
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Doctor Schedule — visibility", () => {
  test("SCH-1: Patient sees slot viewer but NOT schedule form on doctor profile", async ({
    page,
    request,
    loginPage,
    doctorProfilePage,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const token = await getAdminToken(request);
    const { doctor } = await createDeptAndDoctor(request, token, cleanup);

    // Register and log in as a patient
    const patientEmail = faker.internet.email().toLowerCase();
    const patientPassword = "Password123!";
    const regRes = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: {
        role: "patient",
        email: patientEmail,
        password: patientPassword,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
      },
    });
    const newUser = await regRes.json();
    cleanup.addUser(newUser.user?.id ?? newUser.id);

    await loginAs(page, loginPage, patientEmail, patientPassword);
    await doctorProfilePage.goto(doctor.id);

    // Slot viewer is visible to everyone
    await expect(doctorProfilePage.slotViewer).toBeVisible();
    // Schedule form is hidden from non-owning users
    await expect(doctorProfilePage.scheduleForm).not.toBeVisible();
  });
});

test.describe("Doctor Schedule — doctor manages schedule", () => {
  test("SCH-2: Doctor can save their weekly schedule via UI", async ({
    page,
    request,
    loginPage,
    doctorProfilePage,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const token = await getAdminToken(request);
    const { doctor, doctorData } = await createDeptAndDoctor(
      request,
      token,
      cleanup
    );

    // Log in as the doctor themselves
    await loginAs(page, loginPage, doctorData.email, doctorData.password);
    await doctorProfilePage.goto(doctor.id);

    // Schedule form should be visible for the owning doctor
    await expect(doctorProfilePage.scheduleForm).toBeVisible();

    // Toggle Monday on
    await doctorProfilePage.dayToggle("monday").check();
    await expect(doctorProfilePage.startTimeInput("monday")).toBeVisible();

    // Set times
    await doctorProfilePage.startTimeInput("monday").fill("09:00");
    await doctorProfilePage.endTimeInput("monday").fill("17:00");

    // Submit
    await doctorProfilePage.scheduleSubmit.click();
    await expect(doctorProfilePage.scheduleSuccess).toBeVisible();
  });
});

test.describe("Doctor Schedule — patient views available slots", () => {
  test("SCH-3: Available slots appear for patient after doctor sets schedule via API", async ({
    page,
    request,
    loginPage,
    doctorProfilePage,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const token = await getAdminToken(request);
    const { doctor } = await createDeptAndDoctor(request, token, cleanup);

    // Seed a Monday schedule via API (using doctor's own token via admin workaround)
    // We need the doctor's own token to PUT schedule (ownership check)
    // The doctor was created with a known password, so we can log in via API
    const doctorLoginRes = await request.post(
      `${config.apiUrl}/api/v1/auth/login`,
      {
        data: { email: doctor.user.email, password: "Password123!" },
      }
    );
    const { accessToken: doctorToken } = await doctorLoginRes.json();

    await request.put(
      `${config.apiUrl}/api/v1/doctors/${doctor.id}/schedules`,
      {
        data: {
          slotDurationMinutes: 30,
          days: [{ dayOfWeek: "monday", startTime: "09:00", endTime: "10:00" }],
        },
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );

    // Register + login as patient
    const patientEmail = faker.internet.email().toLowerCase();
    const patientPassword = "Password123!";
    const regRes = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: {
        role: "patient",
        email: patientEmail,
        password: patientPassword,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
      },
    });
    const newUser = await regRes.json();
    cleanup.addUser(newUser.user?.id ?? newUser.id);

    await loginAs(page, loginPage, patientEmail, patientPassword);
    await doctorProfilePage.goto(doctor.id);

    // Pick the next Monday date
    const nextMonday = getNextMonday();
    await doctorProfilePage.slotDatePicker.fill(nextMonday);

    // Should see at least one slot button (09:00 and 09:30 Bangkok time)
    await expect(doctorProfilePage.slotButtons().first()).toBeVisible();
    // Empty state should NOT appear
    await expect(doctorProfilePage.slotEmpty).not.toBeVisible();
  });
});
