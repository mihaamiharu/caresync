import { describe, it, expect, vi, beforeEach } from "vitest";
import { app } from "../app";
import { signAccessToken } from "../lib/jwt";

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from "../db";

const BASE_URL = "/api/v1/prescriptions";

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
const RECORD_ID = "b1c2d3e4-0000-4000-8000-000000000005";
const APPOINTMENT_ID = "b1c2d3e4-0000-4000-8000-000000000006";
const PRESCRIPTION_ID = "b1c2d3e4-0000-4000-8000-000000000007";
const ITEM_ID = "b1c2d3e4-0000-4000-8000-000000000008";

const mockDoctor = { id: DOCTOR_ID };
const mockOtherDoctor = { id: OTHER_DOCTOR_ID };
const mockPatient = { id: PATIENT_ID };
const mockOtherPatient = { id: OTHER_PATIENT_ID };

const mockAppointment = {
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
};

const mockPrescription = {
  id: PRESCRIPTION_ID,
  medicalRecordId: RECORD_ID,
  notes: "Take with food",
  createdAt: new Date("2026-03-01T11:00:00.000Z"),
};

// Matches the aliased columns in GET /:id SELECT (mrDoctorId, mrPatientId, etc.)
const mockPrescriptionRow = {
  id: PRESCRIPTION_ID,
  medicalRecordId: RECORD_ID,
  notes: "Take with food",
  createdAt: new Date("2026-03-01T11:00:00.000Z"),
  mrDiagnosis: "Hypertension",
  mrPatientId: PATIENT_ID,
  mrDoctorId: DOCTOR_ID,
  appointmentDate: "2026-03-01",
  appointmentType: "consultation",
  appointmentStatus: "completed",
};

const mockPrescriptionItem = {
  id: ITEM_ID,
  prescriptionId: PRESCRIPTION_ID,
  medicationName: "Aspirin",
  dosage: "100mg",
  frequency: "Once daily",
  duration: "7 days",
  instructions: "Take after meals",
};

// ─── Mock chain helpers ───────────────────────────────────────────────────────

// A fluid thenable chain: every method returns itself; awaitable at any point.
function makeFluidChain(result: unknown[]) {
  const chain: any = {
    then(resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  for (const m of [
    "from",
    "innerJoin",
    "where",
    "orderBy",
    "offset",
    "limit",
  ]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  return chain;
}

function makeJoinChain(result: unknown[]) {
  return makeFluidChain(result);
}

function makeSimpleSelectChain(result: unknown[]) {
  return makeFluidChain(result);
}

function makeCountChain(total: number) {
  return makeFluidChain([{ total }]);
}

function makeWhereChain(result: unknown[]) {
  return makeFluidChain(result);
}

function makeInsertChain(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn().mockReturnValue({ returning });
  return { values };
}

function makeUpdateChain(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  return { set };
}

function makeDeleteChain(result: unknown[]) {
  const where = vi.fn().mockResolvedValue(result);
  return { where };
}

// ─── GET /prescriptions ─────────────────────────────────────────────────────

describe("GET /prescriptions", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 401 when no auth header", async () => {
    const res = await app.request(BASE_URL);
    expect(res.status).toBe(401);
  });

  it("patient returns paginated list with own prescriptions only", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSimpleSelectChain([mockPatient]) as any)
      .mockReturnValueOnce(makeCountChain(1) as any)
      .mockReturnValueOnce(makeJoinChain([mockRecordRow]) as any)
      .mockReturnValueOnce(makeWhereChain([mockPrescriptionItem]) as any);

    const res = await app.request(BASE_URL, { headers: bearer(patientToken) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("admin returns paginated list without role filter", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeCountChain(1) as any)
      .mockReturnValueOnce(makeJoinChain([mockRecordRow]) as any)
      .mockReturnValueOnce(makeWhereChain([mockPrescriptionItem]) as any);

    const res = await app.request(BASE_URL, { headers: bearer(adminToken) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("admin can filter by patientId", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeCountChain(1) as any)
      .mockReturnValueOnce(makeJoinChain([mockRecordRow]) as any)
      .mockReturnValueOnce(makeWhereChain([mockPrescriptionItem]) as any);

    const res = await app.request(`${BASE_URL}?patientId=${PATIENT_ID}`, {
      headers: bearer(adminToken),
    });
    expect(res.status).toBe(200);
  });

  it("doctor returns paginated list with own prescriptions only", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSimpleSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(makeCountChain(1) as any)
      .mockReturnValueOnce(makeJoinChain([mockRecordRow]) as any)
      .mockReturnValueOnce(makeWhereChain([mockPrescriptionItem]) as any);

    const res = await app.request(BASE_URL, { headers: bearer(doctorToken) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

// ─── GET /prescriptions/:id ─────────────────────────────────────────────────

describe("GET /prescriptions/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 401 when no auth header", async () => {
    const res = await app.request(`${BASE_URL}/${PRESCRIPTION_ID}`);
    expect(res.status).toBe(401);
  });

  it("returns 404 when prescription does not exist", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeJoinChain([]) as any);

    const res = await app.request(`${BASE_URL}/${PRESCRIPTION_ID}`, {
      headers: bearer(adminToken),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toMatch(/not found/i);
  });

  it("admin can access any prescription", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeJoinChain([mockPrescriptionRow]) as any)
      .mockReturnValueOnce(makeWhereChain([mockPrescriptionItem]) as any);

    const res = await app.request(`${BASE_URL}/${PRESCRIPTION_ID}`, {
      headers: bearer(adminToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(PRESCRIPTION_ID);
    expect(body.items).toHaveLength(1);
    expect(body.medicalRecord).toBeDefined();
  });

  it("doctor can access their own prescription", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeJoinChain([mockPrescriptionRow]) as any)
      .mockReturnValueOnce(makeSimpleSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(makeWhereChain([mockPrescriptionItem]) as any);

    const res = await app.request(`${BASE_URL}/${PRESCRIPTION_ID}`, {
      headers: bearer(doctorToken),
    });
    expect(res.status).toBe(200);
  });

  it("doctor gets 403 for another doctor's prescription", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(
        makeJoinChain([
          { ...mockPrescriptionRow, mrDoctorId: OTHER_DOCTOR_ID },
        ]) as any
      )
      .mockReturnValueOnce(makeSimpleSelectChain([mockDoctor]) as any);

    const res = await app.request(`${BASE_URL}/${PRESCRIPTION_ID}`, {
      headers: bearer(doctorToken),
    });
    expect(res.status).toBe(403);
  });

  it("patient can access their own prescription", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeJoinChain([mockPrescriptionRow]) as any)
      .mockReturnValueOnce(makeSimpleSelectChain([mockPatient]) as any)
      .mockReturnValueOnce(makeWhereChain([mockPrescriptionItem]) as any);

    const res = await app.request(`${BASE_URL}/${PRESCRIPTION_ID}`, {
      headers: bearer(patientToken),
    });
    expect(res.status).toBe(200);
  });

  it("patient gets 403 for another patient's prescription", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(
        makeJoinChain([
          { ...mockPrescriptionRow, mrPatientId: OTHER_PATIENT_ID },
        ]) as any
      )
      .mockReturnValueOnce(makeSimpleSelectChain([mockPatient]) as any);

    const res = await app.request(`${BASE_URL}/${PRESCRIPTION_ID}`, {
      headers: bearer(patientToken),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid UUID format", async () => {
    const res = await app.request(`${BASE_URL}/not-a-uuid`, {
      headers: bearer(adminToken),
    });
    expect(res.status).toBe(400);
  });
});

// ─── POST /prescriptions ─────────────────────────────────────────────────────

describe("POST /prescriptions", () => {
  const validBody = {
    medicalRecordId: RECORD_ID,
    notes: "Take with food",
    items: [
      {
        medicationName: "Aspirin",
        dosage: "100mg",
        frequency: "Once daily",
        duration: "7 days",
        instructions: "Take after meals",
      },
    ],
  };

  beforeEach(() => vi.resetAllMocks());

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

  it("returns 403 when doctor profile not found", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSimpleSelectChain([]) as any);

    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when medical record not found", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSimpleSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(makeSimpleSelectChain([]) as any);

    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when doctor does not own the record", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSimpleSelectChain([mockOtherDoctor]) as any)
      .mockReturnValueOnce(
        makeSimpleSelectChain([
          { id: RECORD_ID, doctorId: DOCTOR_ID, appointmentId: APPOINTMENT_ID },
        ]) as any
      );

    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(otherDoctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when appointment status not eligible", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSimpleSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(
        makeSimpleSelectChain([
          { id: RECORD_ID, doctorId: DOCTOR_ID, appointmentId: APPOINTMENT_ID },
        ]) as any
      )
      .mockReturnValueOnce(
        makeSimpleSelectChain([{ status: "pending" }]) as any
      );

    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/eligible/i);
  });

  it("returns 409 when prescription already exists for this medical record", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSimpleSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(
        makeSimpleSelectChain([
          { id: RECORD_ID, doctorId: DOCTOR_ID, appointmentId: APPOINTMENT_ID },
        ]) as any
      )
      .mockReturnValueOnce(
        makeSimpleSelectChain([{ status: "completed" }]) as any
      )
      .mockReturnValueOnce(
        makeSimpleSelectChain([{ id: PRESCRIPTION_ID }]) as any
      );

    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toMatch(/already exists/i);
  });

  it("returns 201 and creates prescription with items", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSimpleSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(
        makeSimpleSelectChain([
          { id: RECORD_ID, doctorId: DOCTOR_ID, appointmentId: APPOINTMENT_ID },
        ]) as any
      )
      .mockReturnValueOnce(
        makeSimpleSelectChain([{ status: "completed" }]) as any
      )
      .mockReturnValueOnce(makeSimpleSelectChain([]) as any);

    vi.mocked(db.insert)
      .mockReturnValueOnce(makeInsertChain([mockPrescription]) as any)
      .mockReturnValueOnce(makeInsertChain([mockPrescriptionItem]) as any);

    vi.mocked(db.select).mockReturnValueOnce(
      makeSimpleSelectChain([
        {
          id: RECORD_ID,
          diagnosis: "Hypertension",
          appointmentDate: "2026-03-01",
          appointmentType: "consultation",
          appointmentStatus: "completed",
        },
      ]) as any
    );

    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(PRESCRIPTION_ID);
    expect(body.items).toHaveLength(1);
    expect(body.medicalRecord).toBeDefined();
  });

  it("returns 400 when items array is empty", async () => {
    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify({ medicalRecordId: RECORD_ID, items: [] }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when medicalRecordId is not a valid UUID", async () => {
    const res = await app.request(BASE_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify({
        medicalRecordId: "not-a-uuid",
        items: validBody.items,
      }),
    });
    expect(res.status).toBe(400);
  });
});

// ─── PUT /prescriptions/:id ─────────────────────────────────────────────────

describe("PUT /prescriptions/:id", () => {
  beforeEach(() => vi.resetAllMocks());
  const validBody = {
    notes: "Updated notes",
    items: [
      {
        medicationName: "Ibuprofen",
        dosage: "200mg",
        frequency: "Twice daily",
        duration: "5 days",
        instructions: null,
      },
    ],
  };

  it("returns 401 when no auth header", async () => {
    const res = await app.request(`${BASE_URL}/${PRESCRIPTION_ID}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when called by patient", async () => {
    const res = await app.request(`${BASE_URL}/${PRESCRIPTION_ID}`, {
      method: "PUT",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when called by admin", async () => {
    const res = await app.request(`${BASE_URL}/${PRESCRIPTION_ID}`, {
      method: "PUT",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when doctor profile not found", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSimpleSelectChain([]) as any);

    const res = await app.request(`${BASE_URL}/${PRESCRIPTION_ID}`, {
      method: "PUT",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when prescription not found", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSimpleSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(makeSimpleSelectChain([]) as any);

    const res = await app.request(`${BASE_URL}/${PRESCRIPTION_ID}`, {
      method: "PUT",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when doctor does not own the prescription", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSimpleSelectChain([mockOtherDoctor]) as any)
      .mockReturnValueOnce(
        makeSimpleSelectChain([
          { id: PRESCRIPTION_ID, medicalRecordId: RECORD_ID },
        ]) as any
      )
      .mockReturnValueOnce(
        makeSimpleSelectChain([{ id: RECORD_ID, doctorId: DOCTOR_ID }]) as any
      );

    const res = await app.request(`${BASE_URL}/${PRESCRIPTION_ID}`, {
      method: "PUT",
      headers: { ...jsonHeaders, ...bearer(otherDoctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 and replaces prescription items", async () => {
    const updatedPrescription = { ...mockPrescription, notes: "Updated notes" };
    const updatedItem = {
      ...mockPrescriptionItem,
      medicationName: "Ibuprofen",
      dosage: "200mg",
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(makeSimpleSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(
        makeSimpleSelectChain([
          { id: PRESCRIPTION_ID, medicalRecordId: RECORD_ID },
        ]) as any
      )
      .mockReturnValueOnce(
        makeSimpleSelectChain([{ id: RECORD_ID, doctorId: DOCTOR_ID }]) as any
      );

    vi.mocked(db.update).mockReturnValueOnce(
      makeUpdateChain([updatedPrescription]) as any
    );
    vi.mocked(db.delete).mockReturnValueOnce(makeDeleteChain([]) as any);
    vi.mocked(db.insert).mockReturnValueOnce(
      makeInsertChain([updatedItem]) as any
    );

    vi.mocked(db.select)
      .mockReturnValueOnce(makeSimpleSelectChain([updatedPrescription]) as any)
      .mockReturnValueOnce(
        makeSimpleSelectChain([
          {
            id: RECORD_ID,
            diagnosis: "Hypertension",
            appointmentDate: "2026-03-01",
            appointmentType: "consultation",
            appointmentStatus: "completed",
          },
        ]) as any
      );

    const res = await app.request(`${BASE_URL}/${PRESCRIPTION_ID}`, {
      method: "PUT",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notes).toBe("Updated notes");
  });

  it("returns 400 when items array is empty", async () => {
    const res = await app.request(`${BASE_URL}/${PRESCRIPTION_ID}`, {
      method: "PUT",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify({ notes: "Test", items: [] }),
    });
    expect(res.status).toBe(400);
  });
});
