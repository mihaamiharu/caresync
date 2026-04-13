import { type APIRequestContext } from "@playwright/test";
import { test, expect, CleanupHelper } from "./utils/test-base";
import { faker } from "@faker-js/faker";
import { config } from "./utils/config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

async function createDeptDoctorWithSchedule(
  request: APIRequestContext,
  adminToken: string,
  cleanup: CleanupHelper
) {
  const deptRes = await request.post(`${config.apiUrl}/api/v1/departments`, {
    data: { name: `Appt Mgmt Dept ${faker.string.alphanumeric(6)}` },
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dept = await deptRes.json();
  cleanup.addDepartment(dept.id);

  const doctorData = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    password: "Password123!",
    departmentId: dept.id,
    specialization: "Internal Medicine",
    licenseNumber: faker.string.alphanumeric(10).toUpperCase(),
  };

  const doctorRes = await request.post(`${config.apiUrl}/api/v1/doctors`, {
    data: doctorData,
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const doctor = await doctorRes.json();
  cleanup.addDoctor(doctor.id);

  // Log in as doctor to set schedule
  const doctorLoginRes = await request.post(
    `${config.apiUrl}/api/v1/auth/login`,
    { data: { email: doctorData.email, password: doctorData.password } }
  );
  const { accessToken: doctorToken, user: doctorUser } =
    await doctorLoginRes.json();

  await request.put(`${config.apiUrl}/api/v1/doctors/${doctor.id}/schedules`, {
    data: {
      slotDurationMinutes: 30,
      days: [{ dayOfWeek: "monday", startTime: "09:00", endTime: "17:00" }],
    },
    headers: { Authorization: `Bearer ${doctorToken}` },
  });

  return { dept, doctor, doctorData, doctorToken, doctorUser };
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

async function bookAppointment(
  request: APIRequestContext,
  patientToken: string,
  doctorId: string
) {
  const nextMonday = getNextMonday();
  const slotsRes = await request.get(
    `${config.apiUrl}/api/v1/doctors/${doctorId}/available-slots?date=${nextMonday}`,
    { headers: { Authorization: `Bearer ${patientToken}` } }
  );
  const slots: string[] = await slotsRes.json();
  if (slots.length === 0) throw new Error("No available slots for test");

  const res = await request.post(`${config.apiUrl}/api/v1/appointments`, {
    data: {
      doctorId,
      appointmentDate: nextMonday,
      startTime: slots[0],
      type: "consultation",
      reason: "E2E test appointment",
    },
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  return await res.json();
}

// ─── API tests ────────────────────────────────────────────────────────────────

test.describe("Appointment Management — API", () => {
  test("AM-A1: GET /appointments returns 200 with paginated list for patient", async ({
    request,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const adminToken = await getAdminToken(request);
    const { doctor } = await createDeptDoctorWithSchedule(
      request,
      adminToken,
      cleanup
    );
    const { accessToken: patientToken } = await registerPatient(
      request,
      cleanup
    );

    await bookAppointment(request, patientToken, doctor.id);

    const res = await request.get(`${config.apiUrl}/api/v1/appointments`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page");
    expect(body).toHaveProperty("totalPages");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    // List item shape
    const item = body.data[0];
    expect(item).toHaveProperty("patientName");
    expect(item).toHaveProperty("doctorName");
    expect(item).toHaveProperty("doctorSpecialization");
    expect(item).toHaveProperty("status");
  });

  test("AM-A2: PATCH /appointments/:id/status — doctor confirms (pending → confirmed)", async ({
    request,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const adminToken = await getAdminToken(request);
    const { doctor, doctorToken } = await createDeptDoctorWithSchedule(
      request,
      adminToken,
      cleanup
    );
    const { accessToken: patientToken } = await registerPatient(
      request,
      cleanup
    );

    const appt = await bookAppointment(request, patientToken, doctor.id);
    expect(appt.status).toBe("pending");

    const patchRes = await request.patch(
      `${config.apiUrl}/api/v1/appointments/${appt.id}/status`,
      {
        data: { status: "confirmed" },
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );

    expect(patchRes.status()).toBe(200);
    const body = await patchRes.json();
    expect(body.appointment.status).toBe("confirmed");
    expect(body.appointment.id).toBe(appt.id);
    expect(body.appointment.patient).toBeDefined();
    expect(body.appointment.doctor).toBeDefined();
  });

  test("AM-A3: PATCH returns 422 for invalid transition (pending → completed)", async ({
    request,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const adminToken = await getAdminToken(request);
    const { doctor } = await createDeptDoctorWithSchedule(
      request,
      adminToken,
      cleanup
    );
    const { accessToken: patientToken } = await registerPatient(
      request,
      cleanup
    );

    const appt = await bookAppointment(request, patientToken, doctor.id);

    const res = await request.patch(
      `${config.apiUrl}/api/v1/appointments/${appt.id}/status`,
      {
        data: { status: "completed" },
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.message).toMatch(/invalid.*transition/i);
  });

  test("AM-A4: PATCH returns 403 when patient tries to confirm", async ({
    request,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const adminToken = await getAdminToken(request);
    const { doctor } = await createDeptDoctorWithSchedule(
      request,
      adminToken,
      cleanup
    );
    const { accessToken: patientToken } = await registerPatient(
      request,
      cleanup
    );

    const appt = await bookAppointment(request, patientToken, doctor.id);

    const res = await request.patch(
      `${config.apiUrl}/api/v1/appointments/${appt.id}/status`,
      {
        data: { status: "confirmed" },
        headers: { Authorization: `Bearer ${patientToken}` },
      }
    );

    expect(res.status()).toBe(403);
  });

  test("AM-A5: GET /appointments/:id returns full nested patient and doctor detail", async ({
    request,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const adminToken = await getAdminToken(request);
    const { doctor } = await createDeptDoctorWithSchedule(
      request,
      adminToken,
      cleanup
    );
    const { accessToken: patientToken } = await registerPatient(
      request,
      cleanup
    );

    const appt = await bookAppointment(request, patientToken, doctor.id);

    const res = await request.get(
      `${config.apiUrl}/api/v1/appointments/${appt.id}`,
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(appt.id);
    expect(body.patient).toBeDefined();
    expect(body.patient.user).toBeDefined();
    expect(body.patient.user.passwordHash).toBeUndefined();
    expect(body.doctor).toBeDefined();
    expect(body.doctor.user).toBeDefined();
    expect(body.doctor.user.passwordHash).toBeUndefined();
  });
});

// ─── UI tests ─────────────────────────────────────────────────────────────────

test.describe("Appointment Management — UI", () => {
  test("AM-1: Patient sees their appointments on /appointments list", async ({
    page,
    request,
    loginPage,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const adminToken = await getAdminToken(request);
    const { doctor } = await createDeptDoctorWithSchedule(
      request,
      adminToken,
      cleanup
    );
    const { credentials, accessToken: patientToken } = await registerPatient(
      request,
      cleanup
    );

    const appt = await bookAppointment(request, patientToken, doctor.id);

    await loginPage.goto();
    await loginPage.login(credentials.email, credentials.password);
    await page.waitForURL("/dashboard");

    await page.goto("/appointments");
    await expect(page.getByTestId("appointments-page")).toBeVisible();

    // The appointment row should be visible
    await expect(page.getByTestId(`appointment-row-${appt.id}`)).toBeVisible();

    // Status badge should show "pending"
    await expect(page.getByTestId(`appointment-row-${appt.id}`)).toContainText(
      "Pending"
    );
  });

  test("AM-2: Status filter limits visible appointments", async ({
    page,
    request,
    loginPage,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const adminToken = await getAdminToken(request);
    const { doctor } = await createDeptDoctorWithSchedule(
      request,
      adminToken,
      cleanup
    );
    const { credentials, accessToken: patientToken } = await registerPatient(
      request,
      cleanup
    );

    const appt = await bookAppointment(request, patientToken, doctor.id);

    await loginPage.goto();
    await loginPage.login(credentials.email, credentials.password);
    await page.waitForURL("/dashboard");

    await page.goto("/appointments");

    // Filter to "confirmed" — should not show the pending appointment
    await page.getByTestId("status-filter").selectOption("confirmed");
    await page.waitForURL(/status=confirmed/);

    await expect(
      page.getByTestId(`appointment-row-${appt.id}`)
    ).not.toBeVisible();

    // Switch back to "pending" — should show it
    await page.getByTestId("status-filter").selectOption("pending");
    await expect(page.getByTestId(`appointment-row-${appt.id}`)).toBeVisible();
  });

  test("AM-3: Doctor confirms appointment and status badge updates", async ({
    page,
    request,
    loginPage,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const adminToken = await getAdminToken(request);
    const { doctor, doctorData } = await createDeptDoctorWithSchedule(
      request,
      adminToken,
      cleanup
    );
    const { accessToken: patientToken } = await registerPatient(
      request,
      cleanup
    );

    const appt = await bookAppointment(request, patientToken, doctor.id);

    // Log in as doctor
    await loginPage.goto();
    await loginPage.login(doctorData.email, doctorData.password);
    await page.waitForURL("/dashboard");

    // Navigate to the appointment detail
    await page.goto(`/appointments/${appt.id}`);
    await expect(page.getByTestId("appointment-detail-page")).toBeVisible();

    // Status badge should show pending
    await expect(page.getByTestId("status-badge-pending")).toBeVisible();

    // Click Confirm
    await page.getByTestId("action-confirmed").click();

    // Badge should update to confirmed (no page reload needed)
    await expect(page.getByTestId("status-badge-confirmed")).toBeVisible();
    await expect(page.getByTestId("status-badge-pending")).not.toBeVisible();

    // Confirm button should be gone (no more valid doctor transitions from confirmed except start)
    await expect(page.getByTestId("action-confirmed")).not.toBeVisible();
    await expect(page.getByTestId("action-in-progress")).toBeVisible();
  });

  test("AM-4: Patient cancels appointment with confirmation dialog", async ({
    page,
    request,
    loginPage,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    const adminToken = await getAdminToken(request);
    const { doctor } = await createDeptDoctorWithSchedule(
      request,
      adminToken,
      cleanup
    );
    const { credentials, accessToken: patientToken } = await registerPatient(
      request,
      cleanup
    );

    const appt = await bookAppointment(request, patientToken, doctor.id);

    await loginPage.goto();
    await loginPage.login(credentials.email, credentials.password);
    await page.waitForURL("/dashboard");

    await page.goto(`/appointments/${appt.id}`);
    await expect(page.getByTestId("appointment-detail-page")).toBeVisible();

    // Accept the confirmation dialog automatically
    page.on("dialog", (dialog) => dialog.accept());

    // Click Cancel Appointment
    await page.getByTestId("action-cancelled").click();

    // Status badge should update to cancelled
    await expect(page.getByTestId("status-badge-cancelled")).toBeVisible();

    // Cancel button should be gone (terminal state)
    await expect(page.getByTestId("appointment-actions")).not.toBeVisible();
  });
});
