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

// ─── File attachment helpers ───────────────────────────────────────────────────

/**
 * Creates a small in-memory text file and returns it as a {name, buffer, mimeType}.
 * Playwright's locator.setInputFiles() accepts file paths OR buffer metadata, so we
 * write the temp file to disk first – that is what the browser's file input expects.
 */
async function makeTempFile(
  name: string,
  content: string,
  mimeType: string
): Promise<{ filePath: string; mimeType: string }> {
  const tmpDir = process.env.TEMP || "/tmp";
  const filePath = `${tmpDir}/${name}`;
  const { writeFile } = await import("fs/promises");
  await writeFile(filePath, content);
  return { filePath, mimeType };
}

// ─── API tests ────────────────────────────────────────────────────────────────

test.describe("Medical Record Attachments — API", () => {
  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;
  let recordId: string;
  let doctorData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };

  test.beforeAll(async ({ request }) => {
    test.skip(!config.adminEmail, "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars");
    adminToken = await getAdminToken(request);

    // Create doctor + department
    const deptRes = await request.post(`${config.apiUrl}/api/v1/departments`, {
      data: { name: `MR Attch Dept ${faker.string.alphanumeric(6)}` },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dept = await deptRes.json();

    doctorData = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      password: "Password123!",
    };

    const doctorRes = await request.post(`${config.apiUrl}/api/v1/doctors`, {
      data: {
        ...doctorData,
        departmentId: dept.id,
        specialization: "General Medicine",
        licenseNumber: faker.string.alphanumeric(10).toUpperCase(),
      },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const doctor = await doctorRes.json();

    const doctorLoginRes = await request.post(
      `${config.apiUrl}/api/v1/auth/login`,
      { data: { email: doctorData.email, password: doctorData.password } }
    );
    doctorToken = (await doctorLoginRes.json()).accessToken;

    // Register patient
    const patientEmail = faker.internet.email().toLowerCase();
    const patientRes = await request.post(
      `${config.apiUrl}/api/v1/auth/register`,
      {
        data: {
          role: "patient",
          email: patientEmail,
          password: "Password123!",
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
        },
      }
    );
    patientToken = (await patientRes.json()).accessToken;

    // Create a completed appointment and medical record
    const nextMonday = getNextMonday();

    const slotsRes = await request.get(
      `${config.apiUrl}/api/v1/doctors/${doctor.id}/available-slots?date=${nextMonday}`,
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    const slots: string[] = await slotsRes.json();
    expect(slots.length).toBeGreaterThan(0);

    const apptRes = await request.post(`${config.apiUrl}/api/v1/appointments`, {
      data: {
        doctorId: doctor.id,
        appointmentDate: nextMonday,
        startTime: slots[0],
        type: "consultation",
        reason: "E2E attachment test",
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

    const mrRes = await request.post(
      `${config.apiUrl}/api/v1/medical-records`,
      {
        data: {
          appointmentId: appt.id,
          diagnosis: "E2E Attachment Test Diagnosis",
          symptoms: "None",
          notes: "Test record for attachment flow",
        },
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
    const mr = await mrRes.json();
    recordId = mr.id;
  });

  test("MR-ATT-A1: POST uploads a file attachment and GET returns it", async ({
    request,
  }) => {
    // Create a temp text file
    const { filePath, mimeType } = await makeTempFile(
      `test-attachment-${Date.now()}.txt`,
      "Lab result: Normal blood panel",
      "text/plain"
    );

    const uploadRes = await request.post(
      `${config.apiUrl}/api/v1/medical-records/${recordId}/attachments`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
        multipart: {
          file: {
            name: `test-attachment-${Date.now()}.txt`,
            mimeType,
            buffer: Buffer.from("Lab result: Normal blood panel"),
          },
        },
      }
    );

    expect(uploadRes.status()).toBe(201);
    const attachment = await uploadRes.json();
    expect(attachment.medicalRecordId).toBe(recordId);
    expect(attachment.fileName).toMatch(/test-attachment.*\.txt/);
    expect(attachment.fileUrl).toMatch(/^\/uploads\/attachments\//);
    expect(attachment.fileType).toBe("text/plain");
    expect(attachment.fileSize).toBeGreaterThan(0);

    // GET returns the attachment
    const listRes = await request.get(
      `${config.apiUrl}/api/v1/medical-records/${recordId}/attachments`,
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    expect(listRes.status()).toBe(200);
    const list: unknown[] = await listRes.json();
    expect(list.some((a: any) => a.id === attachment.id)).toBe(true);
  });

  test("MR-ATT-A2: GET /attachments/:id returns a specific attachment", async ({
    request,
  }) => {
    // Upload first
    const uploadRes = await request.post(
      `${config.apiUrl}/api/v1/medical-records/${recordId}/attachments`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
        multipart: {
          file: {
            name: `single-attachment-${Date.now()}.pdf`,
            mimeType: "application/pdf",
            buffer: Buffer.from("Mock PDF content"),
          },
        },
      }
    );
    expect(uploadRes.status()).toBe(201);
    const attachment = await uploadRes.json();

    // Fetch by ID
    const getRes = await request.get(
      `${config.apiUrl}/api/v1/medical-records/${recordId}/attachments/${attachment.id}`,
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    expect(getRes.status()).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.id).toBe(attachment.id);
    expect(fetched.fileName).toBe(attachment.fileName);
  });

  test("MR-ATT-A3: DELETE removes an attachment", async ({ request }) => {
    // Upload
    const uploadRes = await request.post(
      `${config.apiUrl}/api/v1/medical-records/${recordId}/attachments`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
        multipart: {
          file: {
            name: `delete-me-${Date.now()}.txt`,
            mimeType: "text/plain",
            buffer: Buffer.from("To be deleted"),
          },
        },
      }
    );
    expect(uploadRes.status()).toBe(201);
    const attachment = await uploadRes.json();

    // Delete
    const delRes = await request.delete(
      `${config.apiUrl}/api/v1/medical-records/${recordId}/attachments/${attachment.id}`,
      { headers: { Authorization: `Bearer ${doctorToken}` } }
    );
    expect(delRes.status()).toBe(200);

    // Confirm gone
    const getRes = await request.get(
      `${config.apiUrl}/api/v1/medical-records/${recordId}/attachments/${attachment.id}`,
      { headers: { Authorization: `Bearer ${doctorToken}` } }
    );
    expect(getRes.status()).toBe(404);
  });

  test("MR-ATT-A4: POST attachment returns 401 without auth", async ({
    request,
  }) => {
    const res = await request.post(
      `${config.apiUrl}/api/v1/medical-records/${recordId}/attachments`,
      {
        multipart: {
          file: {
            name: "test.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("x"),
          },
        },
      }
    );
    expect(res.status()).toBe(401);
  });

  test("MR-ATT-A5: POST attachment returns 403 for non-doctor (patient)", async ({
    request,
  }) => {
    const res = await request.post(
      `${config.apiUrl}/api/v1/medical-records/${recordId}/attachments`,
      {
        headers: { Authorization: `Bearer ${patientToken}` },
        multipart: {
          file: {
            name: "test.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("x"),
          },
        },
      }
    );
    expect(res.status()).toBe(403);
  });

  test("MR-ATT-A6: POST attachment returns 404 for non-existent record", async ({
    request,
  }) => {
    const fakeId = "00000000-0000-4000-8000-000000000000";
    const res = await request.post(
      `${config.apiUrl}/api/v1/medical-records/${fakeId}/attachments`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
        multipart: {
          file: {
            name: "test.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("x"),
          },
        },
      }
    );
    expect(res.status()).toBe(404);
  });

  test("MR-ATT-A7: DELETE attachment returns 403 for non-owning doctor", async ({
    request,
  }) => {
    // Upload as the real doctor
    const uploadRes = await request.post(
      `${config.apiUrl}/api/v1/medical-records/${recordId}/attachments`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
        multipart: {
          file: {
            name: "owned.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("x"),
          },
        },
      }
    );
    const attachment = await uploadRes.json();

    // Create another doctor
    const deptRes = await request.post(`${config.apiUrl}/api/v1/departments`, {
      data: { name: `Other Dept ${faker.string.alphanumeric(6)}` },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const otherDept = await deptRes.json();

    const otherDocData = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      password: "Password123!",
    };
    const otherDocRes = await request.post(`${config.apiUrl}/api/v1/doctors`, {
      data: {
        ...otherDocData,
        departmentId: otherDept.id,
        specialization: "Surgery",
        licenseNumber: faker.string.alphanumeric(10).toUpperCase(),
      },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const otherDoc = await otherDocRes.json();

    const otherLoginRes = await request.post(
      `${config.apiUrl}/api/v1/auth/login`,
      {
        data: { email: otherDocData.email, password: otherDocData.password },
      }
    );
    const otherToken = (await otherLoginRes.json()).accessToken;

    // That other doctor tries to delete
    const delRes = await request.delete(
      `${config.apiUrl}/api/v1/medical-records/${recordId}/attachments/${attachment.id}`,
      { headers: { Authorization: `Bearer ${otherToken}` } }
    );
    expect(delRes.status()).toBe(403);
  });

  test("MR-ATT-A8: POST returns 400 for disallowed file type", async ({
    request,
  }) => {
    const res = await request.post(
      `${config.apiUrl}/api/v1/medical-records/${recordId}/attachments`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
        multipart: {
          file: {
            name: "malicious.exe",
            mimeType: "application/x-executable",
            buffer: Buffer.from("binary"),
          },
        },
      }
    );
    expect(res.status()).toBe(400);
  });

  test("MR-ATT-A9: GET attachment returns 403 for unauthorized patient", async ({
    request,
  }) => {
    // Create a second patient with no ties to this record
    const otherPatientRes = await request.post(
      `${config.apiUrl}/api/v1/auth/register`,
      {
        data: {
          role: "patient",
          email: faker.internet.email().toLowerCase(),
          password: "Password123!",
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
        },
      }
    );
    const otherToken = (await otherPatientRes.json()).accessToken;

    // Upload an attachment first
    const uploadRes = await request.post(
      `${config.apiUrl}/api/v1/medical-records/${recordId}/attachments`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
        multipart: {
          file: {
            name: "secret.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("secret"),
          },
        },
      }
    );
    const attachment = await uploadRes.json();

    // Other patient tries to GET it
    const getRes = await request.get(
      `${config.apiUrl}/api/v1/medical-records/${recordId}/attachments/${attachment.id}`,
      { headers: { Authorization: `Bearer ${otherToken}` } }
    );
    expect(getRes.status()).toBe(403);
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
    // Clear auth state so the login page doesn't redirect to /dashboard
    await page.evaluate(() => localStorage.clear());
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
