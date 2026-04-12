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

vi.mock("../lib/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("$2a$10$mocked-hash"),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

import { db } from "../db";

const ME_URL = "/api/v1/patients/me";

const mockPatient = {
  id: "patient-uuid-123",
  userId: "user-uuid-123",
  dateOfBirth: "1990-05-15",
  gender: "male" as const,
  bloodType: "A+",
  allergies: "penicillin",
  emergencyContactName: "Jane Doe",
  emergencyContactPhone: "+1234567890",
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

function makeUpdateChain(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  return { set };
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

const jsonHeaders = { "Content-Type": "application/json" };

const patientToken = signAccessToken({
  userId: "user-uuid-123",
  role: "patient",
});
const adminToken = signAccessToken({ userId: "admin-uuid-999", role: "admin" });

// ─── GET /patients/me ─────────────────────────────────────────────────────────

describe("GET /patients/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no Authorization header is provided", async () => {
    const res = await app.request(ME_URL);
    expect(res.status).toBe(401);
  });

  it("returns 403 when called by a non-patient role", async () => {
    const res = await app.request(ME_URL, { headers: bearer(adminToken) });
    expect(res.status).toBe(403);
  });

  it("returns null when no patient row exists for this user", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);

    const res = await app.request(ME_URL, { headers: bearer(patientToken) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeNull();
  });

  it("returns the patient row when it exists", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([mockPatient]) as any
    );

    const res = await app.request(ME_URL, { headers: bearer(patientToken) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("patient-uuid-123");
    expect(body.userId).toBe("user-uuid-123");
    expect(body.dateOfBirth).toBe("1990-05-15");
    expect(body.gender).toBe("male");
    expect(body.bloodType).toBe("A+");
    expect(body.allergies).toBe("penicillin");
  });
});

// ─── PUT /patients/me ─────────────────────────────────────────────────────────

describe("PUT /patients/me", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = {
    dateOfBirth: "1990-05-15",
    gender: "male",
    bloodType: "A+",
    allergies: "penicillin",
    emergencyContactName: "Jane Doe",
    emergencyContactPhone: "+1234567890",
  };

  it("returns 401 when no Authorization header is provided", async () => {
    const res = await app.request(ME_URL, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when called by a non-patient role", async () => {
    const res = await app.request(ME_URL, {
      method: "PUT",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(403);
  });

  it("inserts a new patient row when none exists and returns 200", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);
    vi.mocked(db.insert).mockReturnValueOnce(
      makeInsertWithReturning([mockPatient]) as any
    );

    const res = await app.request(ME_URL, {
      method: "PUT",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("patient-uuid-123");
    expect(body.bloodType).toBe("A+");
  });

  it("updates existing patient row and returns 200", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([mockPatient]) as any
    );
    vi.mocked(db.update).mockReturnValueOnce(
      makeUpdateChain([{ ...mockPatient, allergies: "latex" }]) as any
    );

    const res = await app.request(ME_URL, {
      method: "PUT",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ ...validBody, allergies: "latex" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.allergies).toBe("latex");
  });

  it("returns 400 for an invalid blood type", async () => {
    const res = await app.request(ME_URL, {
      method: "PUT",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ ...validBody, bloodType: "X+" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for a future date of birth", async () => {
    const res = await app.request(ME_URL, {
      method: "PUT",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ ...validBody, dateOfBirth: "2099-01-01" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when allergies exceed 1000 characters", async () => {
    const res = await app.request(ME_URL, {
      method: "PUT",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ ...validBody, allergies: "a".repeat(1001) }),
    });
    expect(res.status).toBe(400);
  });

  it("accepts null values for optional fields", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);
    vi.mocked(db.insert).mockReturnValueOnce(
      makeInsertWithReturning([
        {
          ...mockPatient,
          allergies: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
        },
      ]) as any
    );

    const res = await app.request(ME_URL, {
      method: "PUT",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({
        dateOfBirth: "1990-05-15",
        gender: "male",
        bloodType: "A+",
        allergies: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
      }),
    });

    expect(res.status).toBe(200);
  });
});
