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
    data: { name: `MR Dept ${faker.string.alphanumeric(6)}` },
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
    specialization: "General Medicine",
    licenseNumber: faker.string.alphanumeric(10).toUpperCase(),
  };

  const doctorRes = await request.post(`${config.apiUrl}/api/v1/doctors`, {
    data: doctorData,
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const doctor = await doctorRes.json();
  cleanup.addDoctor(doctor.id);

  const doctorLoginRes = await request.post(
    `${config.apiUrl}/api/v1/auth/login`,
    { data: { email: doctorData.email, password: doctorData.password } }
  );
  const { accessToken: doctorToken } = await doctorLoginRes.json();

  await request.put(`${config.apiUrl}/api/v1/doctors/${doctor.id}/schedules`, {
    data: {
      slotDurationMinutes: 30,
      days: [{ dayOfWeek: "monday", startTime: "09:00", endTime: "17:00" }],
    },
    headers: { Authorization: `Bearer ${doctorToken}` },
  });

  return { dept, doctor, doctorData, doctorToken };
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

async function bookAndCompleteAppointment(
  request: APIRequestContext,
  patientToken: string,
  doctorToken: string,
  doctorId: string,
  adminToken: string
) {
  const nextMonday = getNextMonday();
  const slotsRes = await request.get(
    `${config.apiUrl}/api/v1/doctors/${doctorId}/available-slots?date=${nextMonday}`,
    { headers: { Authorization: `Bearer ${patientToken}` } }
  );
  const slots: string[] = await slotsRes.json();
  if (slots.length === 0) throw new Error("No available slots for test");

  // Book appointment
  const apptRes = await request.post(`${config.apiUrl}/api/v1/appointments`, {
    data: {
      doctorId,
      appointmentDate: nextMonday,
      startTime: slots[0],
      type: "consultation",
      reason: "E2E medical record test",
    },
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const appt = await apptRes.json();

  // Advance through status transitions: pending → confirmed → in-progress → completed
  for (const status of ["confirmed", "in-progress", "completed"] as const) {
    await request.patch(
      `${config.apiUrl}/api/v1/appointments/${appt.id}/status`,
      {
        data: { status },
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
  }

  return appt;
}

// ─── API tests ────────────────────────────────────────────────────────────────

test.describe("Medical Records — API", () => {
  test("MR-A1: POST /medical-records creates record and GET returns it", async ({
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

    const appt = await bookAndCompleteAppointment(
      request,
      patientToken,
      doctorToken,
      doctor.id,
      adminToken
    );

    // Doctor creates medical record
    const createRes = await request.post(
      `${config.apiUrl}/api/v1/medical-records`,
      {
        data: {
          appointmentId: appt.id,
          diagnosis: "Hypertension Stage 1",
          symptoms: "Headache, dizziness",
          notes: "Follow up in 4 weeks",
        },
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );

    expect(createRes.status()).toBe(201);
    const record = await createRes.json();
    expect(record.diagnosis).toBe("Hypertension Stage 1");
    expect(record.appointmentId).toBe(appt.id);

    // Patient can see it in their list
    const listRes = await request.get(
      `${config.apiUrl}/api/v1/medical-records`,
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    expect(listRes.status()).toBe(200);
    const list = await listRes.json();
    expect(list.some((r: { id: string }) => r.id === record.id)).toBe(true);

    // Patient can get by id
    const getRes = await request.get(
      `${config.apiUrl}/api/v1/medical-records/${record.id}`,
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    expect(getRes.status()).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.id).toBe(record.id);
    expect(fetched.diagnosis).toBe("Hypertension Stage 1");
    expect(fetched.doctor?.user?.firstName).toBeDefined();
    expect(fetched.appointment?.appointmentDate).toBeDefined();
  });

  test("MR-A2: POST returns 409 when record already exists for appointment", async ({
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

    const appt = await bookAndCompleteAppointment(
      request,
      patientToken,
      doctorToken,
      doctor.id,
      adminToken
    );

    const body = { appointmentId: appt.id, diagnosis: "First diagnosis" };
    const headers = { Authorization: `Bearer ${doctorToken}` };

    await request.post(`${config.apiUrl}/api/v1/medical-records`, {
      data: body,
      headers,
    });

    // Second attempt
    const res = await request.post(`${config.apiUrl}/api/v1/medical-records`, {
      data: { appointmentId: appt.id, diagnosis: "Duplicate" },
      headers,
    });

    expect(res.status()).toBe(409);
  });
});

// ─── UI happy-path ────────────────────────────────────────────────────────────

test.describe("Medical Records — UI happy-path", () => {
  test("MR-1: Doctor creates record on completed appointment, patient sees it in history", async ({
    page,
    request,
    loginPage,
    cleanup,
  }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");

    // ── API setup ─────────────────────────────────────────────────────────
    const adminToken = await getAdminToken(request);
    const { doctor, doctorData, doctorToken } =
      await createDeptDoctorWithSchedule(request, adminToken, cleanup);
    const { credentials: patientCreds, accessToken: patientToken } =
      await registerPatient(request, cleanup);

    const appt = await bookAndCompleteAppointment(
      request,
      patientToken,
      doctorToken,
      doctor.id,
      adminToken
    );

    // ── Doctor creates medical record via UI ──────────────────────────────
    await loginPage.goto();
    await loginPage.login(doctorData.email, doctorData.password);
    await page.waitForURL("/dashboard");

    await page.goto(`/appointments/${appt.id}`);
    await expect(page.getByTestId("appointment-detail-page")).toBeVisible();

    // Medical record section should be visible with create form
    await expect(page.getByTestId("medical-record-section")).toBeVisible();
    await expect(page.getByTestId("medical-record-form")).toBeVisible();

    // Fill and submit
    await page.getByTestId("mr-diagnosis-input").fill("Hypertension Stage 1");
    await page
      .getByTestId("mr-symptoms-input")
      .fill("Headache, mild dizziness");
    await page
      .getByTestId("mr-notes-input")
      .fill("Prescribe lifestyle changes");
    await page.getByTestId("mr-submit").click();

    // Form should be replaced by read-only view
    await expect(page.getByTestId("medical-record-form")).not.toBeVisible();
    await expect(page.getByTestId("mr-diagnosis")).toBeVisible();
    await expect(page.getByTestId("mr-diagnosis")).toContainText(
      "Hypertension Stage 1"
    );

    // ── Patient sees record in /medical-records ───────────────────────────
    // Log out and log in as patient (navigate to /login to clear state)
    await page.goto("/login");
    await loginPage.login(patientCreds.email, patientCreds.password);
    await page.waitForURL("/dashboard");

    await page.goto("/medical-records");
    await expect(page.getByTestId("medical-records-page")).toBeVisible();

    // At least one record card visible
    await expect(
      page.locator('[data-testid^="medical-record-card-"]').first()
    ).toBeVisible();

    // The record should show the diagnosis
    await expect(
      page.locator('[data-testid^="record-diagnosis-"]').first()
    ).toContainText("Hypertension Stage 1");
  });
});
