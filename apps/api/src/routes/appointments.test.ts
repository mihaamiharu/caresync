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

vi.mock("../lib/schedule-service", () => ({
  computeAvailableSlots: vi.fn(),
}));

import { db } from "../db";
import { computeAvailableSlots } from "../lib/schedule-service";

const APPOINTMENTS_URL = "/api/v1/appointments";

const patientToken = signAccessToken({
  userId: "a1b2c3d4-0000-4000-8000-000000000004",
  role: "patient",
});
const adminToken = signAccessToken({
  userId: "a1b2c3d4-0000-4000-8000-000000000005",
  role: "admin",
});
const doctorToken = signAccessToken({
  userId: "a1b2c3d4-0000-4000-8000-000000000006",
  role: "doctor",
});

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}
const jsonHeaders = { "Content-Type": "application/json" };

// A date 30 days from now — always within the 60-day booking window
const d30 = new Date();
d30.setDate(d30.getDate() + 30);
const FUTURE_DATE = d30.toISOString().substring(0, 10);
const SLOT_ISO = new Date(`${FUTURE_DATE}T02:00:00Z`).toISOString();

const PATIENT_ID = "a1b2c3d4-0000-4000-8000-000000000001";
const DOCTOR_ID = "a1b2c3d4-0000-4000-8000-000000000002";
const APPT_ID = "a1b2c3d4-0000-4000-8000-000000000003";
const USER_PATIENT_ID = "a1b2c3d4-0000-4000-8000-000000000004";

const mockPatient = {
  id: PATIENT_ID,
  userId: USER_PATIENT_ID,
  dateOfBirth: null,
  gender: null,
  bloodType: null,
  allergies: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
};

const mockDoctor = { id: DOCTOR_ID };

const mockSchedule = { slotDurationMinutes: 30 };

const mockAppointment = {
  id: APPT_ID,
  patientId: PATIENT_ID,
  doctorId: DOCTOR_ID,
  appointmentDate: FUTURE_DATE,
  startTime: "02:00:00",
  endTime: "02:30:00",
  status: "pending",
  type: "consultation",
  reason: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── Drizzle chain helpers ────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from };
}

function makeInsertWithReturning(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn().mockReturnValue({ returning });
  return { values };
}

const validBody = {
  doctorId: DOCTOR_ID,
  appointmentDate: FUTURE_DATE,
  startTime: SLOT_ISO,
  type: "consultation",
  reason: "Annual checkup",
};

// ─── POST /appointments ───────────────────────────────────────────────────────

describe("POST /appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(computeAvailableSlots).mockResolvedValue([SLOT_ISO]);
  });

  it("returns 401 when no Authorization header is provided", async () => {
    const res = await app.request(APPOINTMENTS_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when called by admin", async () => {
    const res = await app.request(APPOINTMENTS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when called by doctor", async () => {
    const res = await app.request(APPOINTMENTS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when doctorId is missing", async () => {
    const { doctorId: _, ...body } = validBody;
    const res = await app.request(APPOINTMENTS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid appointment type", async () => {
    const res = await app.request(APPOINTMENTS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ ...validBody, type: "invalid-type" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for a past appointmentDate", async () => {
    const res = await app.request(APPOINTMENTS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ ...validBody, appointmentDate: "2000-01-01" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for an appointmentDate more than 60 days out", async () => {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 61);
    const farFutureStr = farFuture.toISOString().substring(0, 10);

    const res = await app.request(APPOINTMENTS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ ...validBody, appointmentDate: farFutureStr }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when doctor does not exist", async () => {
    // patient found, doctor not found
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([mockPatient]) as any) // patient lookup
      .mockReturnValueOnce(makeSelectChain([]) as any); // doctor lookup

    const res = await app.request(APPOINTMENTS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Doctor not found");
  });

  it("returns 400 when the requested slot is not available", async () => {
    vi.mocked(computeAvailableSlots).mockResolvedValue([]); // no slots
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([mockPatient]) as any)
      .mockReturnValueOnce(makeSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(makeSelectChain([]) as any); // no existing appointment

    const res = await app.request(APPOINTMENTS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("This time slot is not available");
  });

  it("returns 409 when the slot was just booked by another patient", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([mockPatient]) as any)
      .mockReturnValueOnce(makeSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(makeSelectChain([{ id: APPT_ID }]) as any); // existing appt found

    const res = await app.request(APPOINTMENTS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toMatch(/slot was just booked/i);
  });

  it("returns 201 and creates the appointment (existing patient)", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([mockPatient]) as any)
      .mockReturnValueOnce(makeSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(makeSelectChain([]) as any) // no existing appointment
      .mockReturnValueOnce(makeSelectChain([mockSchedule]) as any);

    vi.mocked(db.insert).mockReturnValueOnce(
      makeInsertWithReturning([mockAppointment]) as any
    );

    const res = await app.request(APPOINTMENTS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(APPT_ID);
    expect(body.status).toBe("pending");
    expect(body.patientId).toBe(PATIENT_ID);
    expect(body.doctorId).toBe(DOCTOR_ID);
  });

  it("returns 201 and auto-creates patient record when none exists", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([]) as any) // patient not found
      .mockReturnValueOnce(makeSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(makeSelectChain([]) as any) // no existing appointment
      .mockReturnValueOnce(makeSelectChain([mockSchedule]) as any);

    vi.mocked(db.insert)
      .mockReturnValueOnce(makeInsertWithReturning([mockPatient]) as any) // auto-create patient
      .mockReturnValueOnce(makeInsertWithReturning([mockAppointment]) as any); // create appointment

    const res = await app.request(APPOINTMENTS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(APPT_ID);
  });

  it("allows optional reason and notes to be omitted", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([mockPatient]) as any)
      .mockReturnValueOnce(makeSelectChain([mockDoctor]) as any)
      .mockReturnValueOnce(makeSelectChain([]) as any) // no existing appointment
      .mockReturnValueOnce(makeSelectChain([mockSchedule]) as any);

    vi.mocked(db.insert).mockReturnValueOnce(
      makeInsertWithReturning([
        { ...mockAppointment, reason: null, notes: null },
      ]) as any
    );

    const { reason: _, ...bodyNoReason } = validBody;
    const res = await app.request(APPOINTMENTS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify(bodyNoReason),
    });
    expect(res.status).toBe(201);
  });
});
