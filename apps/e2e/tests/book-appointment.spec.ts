import { type APIRequestContext, type Page } from "@playwright/test";
import { test, expect, CleanupHelper } from "./utils/test-base";
import { faker } from "@faker-js/faker";
import { config } from "./utils/config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Next Monday date in YYYY-MM-DD (UTC). Always 1–7 days in the future. */
function getNextMonday(): string {
  const d = new Date();
  const day = d.getUTCDay();
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
    data: { name: `Book Appt Dept ${faker.string.alphanumeric(6)}` },
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
    specialization: "General Medicine",
    licenseNumber: faker.string.alphanumeric(10).toUpperCase(),
  };

  const doctorRes = await request.post(`${config.apiUrl}/api/v1/doctors`, {
    data: doctorData,
    headers: { Authorization: `Bearer ${token}` },
  });
  const doctor = await doctorRes.json();
  cleanup.addDoctor(doctor.id);

  return { dept, doctor, doctorData };
}

async function setMondaySchedule(
  request: APIRequestContext,
  doctorId: string,
  doctorToken: string
) {
  await request.put(`${config.apiUrl}/api/v1/doctors/${doctorId}/schedules`, {
    data: {
      slotDurationMinutes: 30,
      days: [{ dayOfWeek: "monday", startTime: "09:00", endTime: "17:00" }],
    },
    headers: { Authorization: `Bearer ${doctorToken}` },
  });
}

async function registerPatient(
  request: APIRequestContext,
  cleanup: CleanupHelper
) {
  const credentials = {
    email: faker.internet.email().toLowerCase(),
    password: "Password123!",
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  };

  const res = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
    data: { role: "patient", ...credentials },
  });
  const { user: created, accessToken } = await res.json();
  cleanup.addUser(created.id);

  return { credentials, userId: created.id, accessToken };
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

// ─── UI tests ─────────────────────────────────────────────────────────────────

test.describe("Book Appointment — entry points", () => {
  test("BA-1: Patient sees Book Appointment link in sidebar and dashboard CTA", async ({
    page,
    request,
    loginPage,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const { credentials } = await registerPatient(request, cleanup);
    await loginAs(page, loginPage, credentials.email, credentials.password);

    // Sidebar link visible
    await expect(page.getByTestId("nav-book-appointment")).toBeVisible();

    // Dashboard CTA card visible
    await expect(page.getByTestId("book-appointment-cta")).toBeVisible();
    await expect(
      page.getByTestId("dashboard-book-appointment-link")
    ).toBeVisible();
  });

  test("BA-2: Non-patient (admin) is redirected away from /appointments/book", async ({
    page,
    loginPage,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    await loginPage.goto();
    await loginPage.login(config.adminEmail, config.adminPassword);
    await page.waitForURL("/dashboard");

    await page.goto("/appointments/book");
    // Should redirect to dashboard, not show the wizard
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByTestId("book-appointment-page")).not.toBeVisible();
  });
});

test.describe("Book Appointment — wizard navigation", () => {
  test("BA-3: Back button from step 2 returns to step 1", async ({
    page,
    request,
    loginPage,
    bookAppointmentPage,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const adminToken = await getAdminToken(request);
    const { dept } = await createDeptAndDoctor(request, adminToken, cleanup);
    const { credentials } = await registerPatient(request, cleanup);
    await loginAs(page, loginPage, credentials.email, credentials.password);

    await bookAppointmentPage.goto();

    // Step 1: select department
    await bookAppointmentPage.departmentCard(dept.id).click();

    // Now on step 2 — step indicator shows step 2 is current
    await expect(bookAppointmentPage.stepIndicator(2)).toHaveAttribute(
      "aria-current",
      "step"
    );

    // Click back
    await bookAppointmentPage.backButton.click();

    // Should be back at step 1
    await expect(bookAppointmentPage.stepIndicator(1)).toHaveAttribute(
      "aria-current",
      "step"
    );
    // Department cards are visible again
    await expect(bookAppointmentPage.departmentCard(dept.id)).toBeVisible();
  });

  test("BA-4: Empty state shown when doctor has no schedule on selected day", async ({
    page,
    request,
    loginPage,
    bookAppointmentPage,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const adminToken = await getAdminToken(request);
    // Create doctor with NO schedule
    const { dept, doctor } = await createDeptAndDoctor(
      request,
      adminToken,
      cleanup
    );
    const { credentials } = await registerPatient(request, cleanup);
    await loginAs(page, loginPage, credentials.email, credentials.password);

    await bookAppointmentPage.goto();

    // Step 1 → Step 2
    await bookAppointmentPage.departmentCard(dept.id).click();
    await bookAppointmentPage.doctorCard(doctor.id).click();

    // Step 3: pick next Monday (doctor has no schedule → empty state)
    const nextMonday = getNextMonday();
    await bookAppointmentPage.datePicker.fill(nextMonday);

    await expect(bookAppointmentPage.noSlotsMessage).toBeVisible();
    await expect(bookAppointmentPage.slotGrid).not.toBeVisible();
    // Continue button stays disabled
    await expect(bookAppointmentPage.step3NextButton).toBeDisabled();
  });
});

test.describe("Book Appointment — full happy path", () => {
  test("BA-5: Patient completes full 5-step booking wizard and sees success screen", async ({
    page,
    request,
    loginPage,
    bookAppointmentPage,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    // Setup: dept + doctor via admin
    const adminToken = await getAdminToken(request);
    const { dept, doctor, doctorData } = await createDeptAndDoctor(
      request,
      adminToken,
      cleanup
    );

    // Doctor sets their Monday schedule
    const doctorLoginRes = await request.post(
      `${config.apiUrl}/api/v1/auth/login`,
      { data: { email: doctorData.email, password: doctorData.password } }
    );
    const { accessToken: doctorToken } = await doctorLoginRes.json();
    await setMondaySchedule(request, doctor.id, doctorToken);

    // Register + login as patient
    const { credentials } = await registerPatient(request, cleanup);
    await loginAs(page, loginPage, credentials.email, credentials.password);

    // ── Step 1: Select department ──
    await bookAppointmentPage.goto();
    await expect(bookAppointmentPage.stepIndicator(1)).toHaveAttribute(
      "aria-current",
      "step"
    );
    await bookAppointmentPage.departmentCard(dept.id).click();

    // ── Step 2: Select doctor ──
    await expect(bookAppointmentPage.stepIndicator(2)).toHaveAttribute(
      "aria-current",
      "step"
    );
    await bookAppointmentPage.doctorCard(doctor.id).click();

    // ── Step 3: Date & time ──
    await expect(bookAppointmentPage.stepIndicator(3)).toHaveAttribute(
      "aria-current",
      "step"
    );
    const nextMonday = getNextMonday();
    await bookAppointmentPage.datePicker.fill(nextMonday);

    // Wait for slots to load and pick the first one
    await expect(bookAppointmentPage.slotGrid).toBeVisible();
    const firstSlot = bookAppointmentPage.firstSlot();
    await expect(firstSlot).toBeVisible();
    await firstSlot.click();

    // Continue to step 4
    await expect(bookAppointmentPage.step3NextButton).toBeEnabled();
    await bookAppointmentPage.step3NextButton.click();

    // ── Step 4: Details ──
    await expect(bookAppointmentPage.stepIndicator(4)).toHaveAttribute(
      "aria-current",
      "step"
    );
    await bookAppointmentPage.appointmentTypeSelect.selectOption(
      "consultation"
    );
    await bookAppointmentPage.reasonInput.fill("Annual check-up e2e test");

    // Confirm
    await bookAppointmentPage.confirmButton.click();

    // ── Step 5: Success ──
    await expect(bookAppointmentPage.stepIndicator(5)).toHaveAttribute(
      "aria-current",
      "step"
    );
    await expect(bookAppointmentPage.viewAppointmentsButton).toBeVisible();
    await expect(bookAppointmentPage.bookAnotherButton).toBeVisible();
  });

  test("BA-6: 'Book Another' resets the wizard to step 1", async ({
    page,
    request,
    loginPage,
    bookAppointmentPage,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const adminToken = await getAdminToken(request);
    const { dept, doctor, doctorData } = await createDeptAndDoctor(
      request,
      adminToken,
      cleanup
    );

    const doctorLoginRes = await request.post(
      `${config.apiUrl}/api/v1/auth/login`,
      { data: { email: doctorData.email, password: doctorData.password } }
    );
    const { accessToken: doctorToken } = await doctorLoginRes.json();
    await setMondaySchedule(request, doctor.id, doctorToken);

    const { credentials } = await registerPatient(request, cleanup);
    await loginAs(page, loginPage, credentials.email, credentials.password);

    // Complete full booking flow
    await bookAppointmentPage.goto();
    await bookAppointmentPage.departmentCard(dept.id).click();
    await bookAppointmentPage.doctorCard(doctor.id).click();
    await bookAppointmentPage.datePicker.fill(getNextMonday());
    await expect(bookAppointmentPage.slotGrid).toBeVisible();
    await bookAppointmentPage.firstSlot().click();
    await bookAppointmentPage.step3NextButton.click();
    await bookAppointmentPage.confirmButton.click();

    // On success screen — click "Book Another"
    await expect(bookAppointmentPage.bookAnotherButton).toBeVisible();
    await bookAppointmentPage.bookAnotherButton.click();

    // Wizard resets to step 1
    await expect(bookAppointmentPage.stepIndicator(1)).toHaveAttribute(
      "aria-current",
      "step"
    );
    await expect(bookAppointmentPage.departmentCard(dept.id)).toBeVisible();
  });
});

// ─── API-level tests ──────────────────────────────────────────────────────────

test.describe("Book Appointment — API", () => {
  test("BA-A1: POST /appointments creates appointment with status pending", async ({
    request,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const adminToken = await getAdminToken(request);
    const { doctor, doctorData } = await createDeptAndDoctor(
      request,
      adminToken,
      cleanup
    );

    // Set Monday schedule
    const doctorLoginRes = await request.post(
      `${config.apiUrl}/api/v1/auth/login`,
      { data: { email: doctorData.email, password: doctorData.password } }
    );
    const { accessToken: doctorToken } = await doctorLoginRes.json();
    await setMondaySchedule(request, doctor.id, doctorToken);

    // Register patient
    const { accessToken: patientToken } = await registerPatient(
      request,
      cleanup
    );

    // Fetch available slots for next Monday
    const nextMonday = getNextMonday();
    const slotsRes = await request.get(
      `${config.apiUrl}/api/v1/doctors/${doctor.id}/available-slots?date=${nextMonday}`,
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    const slots: string[] = await slotsRes.json();
    expect(slots.length).toBeGreaterThan(0);

    // Book appointment
    const bookRes = await request.post(`${config.apiUrl}/api/v1/appointments`, {
      data: {
        doctorId: doctor.id,
        appointmentDate: nextMonday,
        startTime: slots[0],
        type: "consultation",
        reason: "API e2e test",
      },
      headers: { Authorization: `Bearer ${patientToken}` },
    });

    expect(bookRes.status()).toBe(201);
    const appt = await bookRes.json();
    expect(appt.status).toBe("pending");
    expect(appt.doctorId).toBe(doctor.id);
    expect(appt.appointmentDate).toBe(nextMonday);
    expect(appt.type).toBe("consultation");
    expect(appt.reason).toBe("API e2e test");
  });

  test("BA-A2: POST /appointments returns 409 when same slot booked twice", async ({
    request,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const adminToken = await getAdminToken(request);
    const { doctor, doctorData } = await createDeptAndDoctor(
      request,
      adminToken,
      cleanup
    );

    const doctorLoginRes = await request.post(
      `${config.apiUrl}/api/v1/auth/login`,
      { data: { email: doctorData.email, password: doctorData.password } }
    );
    const { accessToken: doctorToken } = await doctorLoginRes.json();
    await setMondaySchedule(request, doctor.id, doctorToken);

    // Two separate patients
    const { accessToken: patientToken1 } = await registerPatient(
      request,
      cleanup
    );
    const { accessToken: patientToken2 } = await registerPatient(
      request,
      cleanup
    );

    const nextMonday = getNextMonday();
    const slotsRes = await request.get(
      `${config.apiUrl}/api/v1/doctors/${doctor.id}/available-slots?date=${nextMonday}`,
      { headers: { Authorization: `Bearer ${patientToken1}` } }
    );
    const slots: string[] = await slotsRes.json();
    expect(slots.length).toBeGreaterThan(0);

    const payload = {
      doctorId: doctor.id,
      appointmentDate: nextMonday,
      startTime: slots[0],
      type: "consultation",
    };

    // First booking succeeds
    const first = await request.post(`${config.apiUrl}/api/v1/appointments`, {
      data: payload,
      headers: { Authorization: `Bearer ${patientToken1}` },
    });
    expect(first.status()).toBe(201);

    // Second booking on same slot conflicts
    const second = await request.post(`${config.apiUrl}/api/v1/appointments`, {
      data: payload,
      headers: { Authorization: `Bearer ${patientToken2}` },
    });
    expect(second.status()).toBe(409);
    const body = await second.json();
    expect(body.message).toMatch(/slot was just booked/i);
  });

  test("BA-A3: POST /appointments returns 403 for admin role", async ({
    request,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const adminToken = await getAdminToken(request);
    const res = await request.post(`${config.apiUrl}/api/v1/appointments`, {
      data: {
        doctorId: "00000000-0000-4000-8000-000000000001",
        appointmentDate: "2099-01-01",
        startTime: "2099-01-01T02:00:00.000Z",
        type: "consultation",
      },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test("BA-A4: POST /appointments returns 400 for a past date", async ({
    request,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const { accessToken } = await registerPatient(request, cleanup);

    const res = await request.post(`${config.apiUrl}/api/v1/appointments`, {
      data: {
        doctorId: "00000000-0000-4000-8000-000000000001",
        appointmentDate: "2000-01-01",
        startTime: "2000-01-01T02:00:00.000Z",
        type: "consultation",
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(400);
  });
});
