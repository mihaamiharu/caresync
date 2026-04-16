import { type APIRequestContext } from "@playwright/test";
import { test, expect, CleanupHelper } from "./utils/test-base";
import { faker } from "@faker-js/faker";
import { config } from "./utils/config";

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
    data: { name: `MR Attach Dept ${faker.string.alphanumeric(6)}` },
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
  doctorId: string
) {
  const nextMonday = getNextMonday();
  const slotsRes = await request.get(
    `${config.apiUrl}/api/v1/doctors/${doctorId}/available-slots?date=${nextMonday}`,
    { headers: { Authorization: `Bearer ${patientToken}` } }
  );
  const slots: string[] = await slotsRes.json();
  if (slots.length === 0) throw new Error("No available slots for test");

  const apptRes = await request.post(`${config.apiUrl}/api/v1/appointments`, {
    data: {
      doctorId,
      appointmentDate: nextMonday,
      startTime: slots[0],
      type: "consultation",
      reason: "E2E medical record attachment test",
    },
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const appt = await apptRes.json();

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

async function createMedicalRecord(
  request: APIRequestContext,
  doctorToken: string,
  appointmentId: string
) {
  const res = await request.post(`${config.apiUrl}/api/v1/medical-records`, {
    data: {
      appointmentId,
      diagnosis: "Attachment test diagnosis",
      symptoms: "Attachment test symptoms",
      notes: "Attachment test notes",
    },
    headers: { Authorization: `Bearer ${doctorToken}` },
  });
  expect(res.status()).toBe(201);
  return await res.json();
}

test.describe("Medical Records — Attachments (E2E)", () => {
  test("MR-ATT-1: Doctor uploads PDF, patient downloads it; unsupported type shows error", async ({
    page,
    request,
    loginPage,
    cleanup,
  }) => {
    test.setTimeout(120_000);
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
      doctor.id
    );
    const record = await createMedicalRecord(request, doctorToken, appt.id);

    // ── Doctor uploads a PDF via UI ───────────────────────────────────────
    await loginPage.goto();
    await loginPage.login(doctorData.email, doctorData.password);
    await page.waitForURL("/dashboard");

    await page.goto(`/medical-records/${record.id}`);
    await expect(page.getByTestId("medical-record-detail-page")).toBeVisible();
    await expect(page.getByTestId("upload-zone")).toBeVisible();

    const pdfName = `report-${faker.string.alphanumeric(6)}.pdf`;
    const pdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
    await page.getByTestId("file-input").setInputFiles({
      name: pdfName,
      mimeType: "application/pdf",
      buffer: pdfBuffer,
    });

    await expect(page.getByText(pdfName)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("link", { name: "Download" })).toBeVisible({
      timeout: 60_000,
    });

    // ── Doctor tries unsupported upload ───────────────────────────────────
    await page.getByTestId("file-input").setInputFiles({
      name: "not-allowed.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("nope"),
    });
    await expect(page.getByTestId("upload-error")).toBeVisible({
      timeout: 60_000,
    });

    // ── Patient downloads via UI ──────────────────────────────────────────
    await page.evaluate(() => localStorage.clear());
    await page.goto("/login");
    await loginPage.login(patientCreds.email, patientCreds.password);
    await page.waitForURL("/dashboard");

    await page.goto(`/medical-records/${record.id}`);
    await expect(page.getByTestId("medical-record-detail-page")).toBeVisible();
    await expect(page.getByText(pdfName)).toBeVisible({ timeout: 60_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60_000 }),
      page.getByRole("link", { name: "Download" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(pdfName);
  });
});
