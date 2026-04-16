import { describe, it, expect, vi, beforeEach } from "vitest";
import { app } from "../app";
import { signAccessToken } from "../lib/jwt";

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

import { db } from "../db";

const BASE_URL = "/api/v1/medical-records";

// ─── Tokens ───────────────────────────────────────────────────────────────────

const USER_DOCTOR_ID = "a1b2c3d4-0000-4000-8000-000000000010";
const USER_PATIENT_ID = "a1b2c3d4-0000-4000-8000-000000000020";
const USER_ADMIN_ID = "a1b2c3d4-0000-4000-8000-000000000030";
const OTHER_USER_DOCTOR_ID = "a1b2c3d4-0000-4000-8000-000000000011";
const OTHER_USER_PATIENT_ID = "a1b2c3d4-0000-4000-8000-000000000021";

const doctorToken = signAccessToken({ userId: USER_DOCTOR_ID, role: "doctor" });
const patientToken = signAccessToken({
  userId: USER_PATIENT_ID,
  role: "patient",
});
const adminToken = signAccessToken({ userId: USER_ADMIN_ID, role: "admin" });
const otherDoctorToken = signAccessToken({
  userId: OTHER_USER_DOCTOR_ID,
  role: "doctor",
});
const otherPatientToken = signAccessToken({
  userId: OTHER_USER_PATIENT_ID,
  role: "patient",
});

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}
const jsonHeaders = { "Content-Type": "application/json" };

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DOCTOR_ID = "b1c2d3e4-0000-4000-8000-000000000001";
const OTHER_DOCTOR_ID = "b1c2d3e4-0000-4000-8000-000000000002";
const PATIENT_ID = "b1c2d3e4-0000-4000-8000-000000000003";
const OTHER_PATIENT_ID = "b1c2d3e4-0000-4000-8000-000000000004";
const APPOINTMENT_ID = "b1c2d3e4-0000-4000-8000-000000000005";
const RECORD_ID = "b1c2d3e4-0000-4000-8000-000000000006";
const ATTACHMENT_ID = "b1c2d3e4-0000-4000-8000-000000000007";

const mockDoctor = { id: DOCTOR_ID };
const mockOtherDoctor = { id: OTHER_DOCTOR_ID };
const mockPatient = { id: PATIENT_ID };
const mockOtherPatient = { id: OTHER_PATIENT_ID };

const mockAttachment = {
  id: ATTACHMENT_ID,
  medicalRecordId: RECORD_ID,
  fileName: "lab-result.pdf",
  fileUrl: "/uploads/medical-records/some-uuid.pdf",
  fileType: "application/pdf",
  fileSize: 12345,
};

const mockCompletedAppointment = {
  id: APPOINTMENT_ID,
  patientId: PATIENT_ID,
  doctorId: DOCTOR_ID,
  appointmentDate: "2026-03-01",
  startTime: "09:00:00",
  endTime: "09:30:00",
  status: "completed",
  type: "consultation",
  reason: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockRecord = {
  id: RECORD_ID,
  appointmentId: APPOINTMENT_ID,
  patientId: PATIENT_ID,
  doctorId: DOCTOR_ID,
  diagnosis: "Hypertension",
  symptoms: "Headache, dizziness",
  notes: "Follow up in 2 weeks",
  createdAt: new Date("2026-03-01T10:00:00.000Z"),
};

const mockRecordRow = {
  id: RECORD_ID,
  appointmentId: APPOINTMENT_ID,
  patientId: PATIENT_ID,
  doctorId: DOCTOR_ID,
  diagnosis: "Hypertension",
  symptoms: "Headache, dizziness",
  notes: "Follow up in 2 weeks",
  createdAt: new Date("2026-03-01T10:00:00.000Z"),
  appointmentDate: "2026-03-01",
  startTime: "09:00:00",
  appointmentType: "consultation",
  appointmentStatus: "completed",
  doctorSpecialization: "Cardiology",
  doctorFirstName: "Jane",
  doctorLastName: "Smith",
};

// ─── Mock chain helpers ───────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where, limit });
  return { from };
}

function makeJoinChain(result: unknown[]) {
  const chain: any = {};
  for (const m of ["from", "innerJoin", "where"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.orderBy = vi.fn().mockResolvedValue(result);
  chain.limit = vi.fn().mockResolvedValue(result);
  return chain;
}

function makeInsertWithReturning(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn().mockReturnValue({ returning });
  return { values };
}

// Resolves on .where() directly (no .limit()) — used for attachment queries
function makeSelectWhereChain(result: unknown[]) {
  const where = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ where });
  return { from };
}

// ─── POST /medical-records ────────────────────────────────────────────────────

describe("POST /medical-records", () => {
  const validBody = {
    appointmentId: APPOINTMENT_ID,
    diagnosis: "Hypertension",
    symptoms: "Headache",
    notes: null,
  };

  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no auth header", async () => {
    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when called by patient", async () => {
    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when called by admin", async () => {
    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when diagnosis is missing", async () => {
    const { diagnosis: _, ...body } = validBody;
    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(400);
  });

  it("returns 403 when doctor profile not found", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);

    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toMatch(/doctor profile not found/i);
  });

  it("returns 404 when appointment not found", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(makeSelectChain([]) as any);

    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when appointment is not completed", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(
        makeSelectChain([
          { ...mockCompletedAppointment, status: "pending" },
        ]) as any
      );

    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/completed/i);
  });

  it("returns 403 when appointment belongs to a different doctor", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([mockOtherDoctor]) as any) // different doctor
      .mockReturnValueOnce(makeSelectChain([mockCompletedAppointment]) as any); // appointment is for DOCTOR_ID

    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(otherDoctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toMatch(/your own appointments/i);
  });

  it("returns 409 when a record already exists for this appointment", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(makeSelectChain([mockCompletedAppointment]) as any)
      .mockReturnValueOnce(makeSelectChain([{ id: RECORD_ID }]) as any); // existing record

    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toMatch(/already exists/i);
  });

  it("returns 201 and creates the medical record", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(makeSelectChain([mockCompletedAppointment]) as any)
      .mockReturnValueOnce(makeSelectChain([]) as any); // no existing record

    vi.mocked(db.insert).mockReturnValueOnce(
      makeInsertWithReturning([mockRecord]) as any
    );

    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(RECORD_ID);
    expect(body.diagnosis).toBe("Hypertension");
    expect(body.appointmentId).toBe(APPOINTMENT_ID);
    expect(body.patientId).toBe(PATIENT_ID);
    expect(body.doctorId).toBe(DOCTOR_ID);
  });
});

// ─── GET /medical-records ─────────────────────────────────────────────────────

describe("GET /medical-records", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no auth header", async () => {
    const res = await app.request(BASE_URL);
    expect(res.status).toBe(401);
  });

  it("patient gets only their own records", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([mockPatient]) as any)
      .mockReturnValueOnce(makeJoinChain([mockRecordRow]) as any);

    const res = await app.request(BASE_URL, { headers: bearer(patientToken) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(RECORD_ID);
    expect(body[0].diagnosis).toBe("Hypertension");
    expect(body[0].doctor.user.firstName).toBe("Jane");
    expect(body[0].appointment.appointmentDate).toBe("2026-03-01");
  });

  it("patient with no patient profile gets empty array", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);

    const res = await app.request(BASE_URL, { headers: bearer(patientToken) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("doctor gets only their own records", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(makeJoinChain([mockRecordRow]) as any);

    const res = await app.request(BASE_URL, { headers: bearer(doctorToken) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(RECORD_ID);
  });

  it("admin gets all records without filter", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      makeJoinChain([mockRecordRow]) as any
    );

    const res = await app.request(BASE_URL, { headers: bearer(adminToken) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it("admin can filter by patientId", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      makeJoinChain([mockRecordRow]) as any
    );

    const res = await app.request(`${BASE_URL}?patientId=${PATIENT_ID}`, {
      headers: bearer(adminToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

// ─── GET /medical-records/:id ─────────────────────────────────────────────────

describe("GET /medical-records/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no auth header", async () => {
    const res = await app.request(`${BASE_URL}/${RECORD_ID}`);
    expect(res.status).toBe(401);
  });

  it("returns 404 when record does not exist", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeJoinChain([]) as any);

    const res = await app.request(`${BASE_URL}/${RECORD_ID}`, {
      headers: bearer(adminToken),
    });
    expect(res.status).toBe(404);
  });

  it("admin can access any record", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeJoinChain([mockRecordRow]) as any)
      .mockReturnValueOnce(makeSelectWhereChain([]) as any); // attachments query

    const res = await app.request(`${BASE_URL}/${RECORD_ID}`, {
      headers: bearer(adminToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(RECORD_ID);
    expect(body.diagnosis).toBe("Hypertension");
  });

  it("doctor can access their own record", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeJoinChain([mockRecordRow]) as any)
      .mockReturnValueOnce(makeSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(makeSelectWhereChain([]) as any); // attachments query

    const res = await app.request(`${BASE_URL}/${RECORD_ID}`, {
      headers: bearer(doctorToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(RECORD_ID);
  });

  it("doctor gets 403 for another doctor's record", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeJoinChain([mockRecordRow]) as any) // record found
      .mockReturnValueOnce(makeSelectChain([mockOtherDoctor]) as any); // different doctor — 403 before attachments

    const res = await app.request(`${BASE_URL}/${RECORD_ID}`, {
      headers: bearer(otherDoctorToken),
    });
    expect(res.status).toBe(403);
  });

  it("patient can access their own record", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeJoinChain([mockRecordRow]) as any)
      .mockReturnValueOnce(makeSelectChain([mockPatient]) as any)
      .mockReturnValueOnce(makeSelectWhereChain([]) as any); // attachments query

    const res = await app.request(`${BASE_URL}/${RECORD_ID}`, {
      headers: bearer(patientToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(RECORD_ID);
  });

  it("patient gets 403 for another patient's record", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeJoinChain([mockRecordRow]) as any) // record found
      .mockReturnValueOnce(makeSelectChain([mockOtherPatient]) as any); // different patient — 403 before attachments

    const res = await app.request(`${BASE_URL}/${RECORD_ID}`, {
      headers: bearer(otherPatientToken),
    });
    expect(res.status).toBe(403);
  });

  it("response includes attachments array", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeJoinChain([mockRecordRow]) as any)
      .mockReturnValueOnce(makeSelectWhereChain([mockAttachment]) as any); // attachments query

    const res = await app.request(`${BASE_URL}/${RECORD_ID}`, {
      headers: bearer(adminToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0].id).toBe(ATTACHMENT_ID);
    expect(body.attachments[0].fileName).toBe("lab-result.pdf");
    expect(body.attachments[0].fileSize).toBe(12345);
  });
});
