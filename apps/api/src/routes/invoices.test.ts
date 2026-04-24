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

const INVOICES_URL = "/api/v1/invoices";

beforeEach(() => {
  vi.clearAllMocks();
});

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

const PATIENT_ID = "a1b2c3d4-0000-4000-8000-000000000001";
const APPOINTMENT_ID = "a1b2c3d4-0000-4000-8000-000000000003";
const USER_PATIENT_ID = "a1b2c3d4-0000-4000-8000-000000000004";
const INVOICE_ID = "a1b2c3d4-0000-4000-8000-000000000010";

const mockInvoice = {
  id: INVOICE_ID,
  appointmentId: APPOINTMENT_ID,
  patientId: PATIENT_ID,
  amount: "150.00",
  tax: "15.00",
  total: "165.00",
  status: "pending",
  dueDate: "2026-05-01",
  paidAt: null,
  createdAt: new Date().toISOString(),
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

function makeJoinChain(result: unknown[]) {
  const chain: any = {};
  for (const m of ["from", "innerJoin", "leftJoin", "where", "orderBy"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.offset = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  return chain;
}

function makeCountChain(result: unknown[]) {
  // Matches: db.select({ total: sql`...` }).from(invoices).where(...).limit(1)
  // OR for admin with no conditions: db.select({ total: sql`...` }).from(invoices).limit(1)
  const chain: any = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  return chain;
}

function makeInvoiceDataChain(result: unknown[]) {
  // Matches: db.select({ ... }).from(invoices).innerJoin(...).where(...).orderBy(...).offset(...).limit(...)
  const chain: any = {};
  for (const m of ["from", "innerJoin", "leftJoin", "where", "orderBy"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.offset = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  return chain;
}

// ─── POST /invoices ──────────────────────────────────────────────────────────

describe("POST /invoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no Authorization header is provided", async () => {
    const res = await app.request(INVOICES_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ appointmentId: APPOINTMENT_ID, amount: "150.00" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when called by patient", async () => {
    const res = await app.request(INVOICES_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ appointmentId: APPOINTMENT_ID, amount: "150.00" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when called by doctor", async () => {
    const res = await app.request(INVOICES_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify({ appointmentId: APPOINTMENT_ID, amount: "150.00" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when appointmentId is missing", async () => {
    const res = await app.request(INVOICES_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
      body: JSON.stringify({ amount: "150.00" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when amount is missing", async () => {
    const res = await app.request(INVOICES_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
      body: JSON.stringify({ appointmentId: APPOINTMENT_ID }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when amount is not a valid number", async () => {
    const res = await app.request(INVOICES_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
      body: JSON.stringify({
        appointmentId: APPOINTMENT_ID,
        amount: "invalid",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when amount is negative", async () => {
    const res = await app.request(INVOICES_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
      body: JSON.stringify({ appointmentId: APPOINTMENT_ID, amount: "-50.00" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when appointment does not exist", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);

    const res = await app.request(INVOICES_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
      body: JSON.stringify({ appointmentId: APPOINTMENT_ID, amount: "150.00" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Appointment not found");
  });

  it("returns 409 when invoice already exists for appointment", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([{ id: APPOINTMENT_ID }]) as any)
      .mockReturnValueOnce(makeSelectChain([{ id: INVOICE_ID }]) as any);

    const res = await app.request(INVOICES_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
      body: JSON.stringify({ appointmentId: APPOINTMENT_ID, amount: "150.00" }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toBe("Invoice already exists for this appointment");
  });

  it("returns 201 and creates the invoice", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([{ id: APPOINTMENT_ID }]) as any)
      .mockReturnValueOnce(makeSelectChain([]) as any)
      .mockReturnValueOnce(
        makeSelectChain([{ userId: USER_PATIENT_ID }]) as any
      );

    vi.mocked(db.insert)
      .mockReturnValueOnce(makeInsertWithReturning([mockInvoice]) as any)
      .mockReturnValueOnce(
        makeInsertWithReturning([{ id: "notif-id" }]) as any
      );

    const res = await app.request(INVOICES_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
      body: JSON.stringify({
        appointmentId: APPOINTMENT_ID,
        amount: "150.00",
        tax: "15.00",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(INVOICE_ID);
    expect(body.status).toBe("pending");
  });

  it("returns 201 with default tax of 0 when tax is not provided", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([{ id: APPOINTMENT_ID }]) as any)
      .mockReturnValueOnce(makeSelectChain([]) as any)
      .mockReturnValueOnce(
        makeSelectChain([{ userId: USER_PATIENT_ID }]) as any
      );

    vi.mocked(db.insert)
      .mockReturnValueOnce(
        makeInsertWithReturning([
          { ...mockInvoice, tax: "0.00", total: "150.00" },
        ]) as any
      )
      .mockReturnValueOnce(
        makeInsertWithReturning([{ id: "notif-id" }]) as any
      );

    const res = await app.request(INVOICES_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
      body: JSON.stringify({ appointmentId: APPOINTMENT_ID, amount: "150.00" }),
    });
    expect(res.status).toBe(201);
  });
});

// ─── GET /invoices ────────────────────────────────────────────────────────────

describe("GET /invoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no Authorization header", async () => {
    const res = await app.request(INVOICES_URL, { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("returns 200 with paginated list for patient role (own invoices only)", async () => {
    const mockRow = {
      id: INVOICE_ID,
      appointmentId: APPOINTMENT_ID,
      patientId: PATIENT_ID,
      amount: "150.00",
      tax: "15.00",
      total: "165.00",
      status: "pending",
      dueDate: "2026-05-01",
      paidAt: null,
      createdAt: new Date().toISOString(),
      patientFirstName: "John",
      patientLastName: "Doe",
      appointmentDate: "2026-04-20",
    };
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([{ id: PATIENT_ID }]) as any)
      .mockReturnValueOnce(makeCountChain([{ count: 1 }]) as any)
      .mockReturnValueOnce(makeInvoiceDataChain([mockRow]) as any);

    const res = await app.request(INVOICES_URL, {
      method: "GET",
      headers: bearer(patientToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

// ─── GET /invoices/:id ───────────────────────────────────────────────────────

describe("GET /invoices/:id", () => {
  const DETAIL_URL = `${INVOICES_URL}/${INVOICE_ID}`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no Authorization header", async () => {
    const res = await app.request(DETAIL_URL, { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("returns 404 when invoice does not exist", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeJoinChain([]) as any);
    const res = await app.request(DETAIL_URL, {
      method: "GET",
      headers: bearer(adminToken),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 with invoice detail for admin", async () => {
    const mockRow = {
      invoice: { ...mockInvoice },
      patient: { id: PATIENT_ID, userId: USER_PATIENT_ID },
      patientUser: {
        id: USER_PATIENT_ID,
        email: "patient@test.com",
        firstName: "John",
        lastName: "Doe",
      },
      appointment: {
        id: APPOINTMENT_ID,
        appointmentDate: "2026-04-20",
        startTime: "09:00:00",
        endTime: "09:30:00",
        type: "consultation",
      },
    };
    vi.mocked(db.select).mockReturnValueOnce(makeJoinChain([mockRow]) as any);
    const res = await app.request(DETAIL_URL, {
      method: "GET",
      headers: bearer(adminToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(INVOICE_ID);
    expect(body.patientName).toBe("John Doe");
  });

  it("returns 200 when patient accesses own invoice", async () => {
    const mockRow = {
      invoice: { ...mockInvoice, patientId: PATIENT_ID },
      patient: { id: PATIENT_ID, userId: USER_PATIENT_ID },
      patientUser: {
        id: USER_PATIENT_ID,
        email: "patient@test.com",
        firstName: "John",
        lastName: "Doe",
      },
      appointment: {
        id: APPOINTMENT_ID,
        appointmentDate: "2026-04-20",
        startTime: "09:00:00",
        endTime: "09:30:00",
        type: "consultation",
      },
    };
    vi.mocked(db.select)
      .mockReturnValueOnce(makeJoinChain([mockRow]) as any)
      .mockReturnValueOnce(makeSelectChain([{ id: PATIENT_ID }]) as any);
    const res = await app.request(DETAIL_URL, {
      method: "GET",
      headers: bearer(patientToken),
    });
    expect(res.status).toBe(200);
  });
});

// ─── PATCH /invoices/:id/pay ─────────────────────────────────────────────────

describe("PATCH /invoices/:id/pay", () => {
  const PAY_URL = `${INVOICES_URL}/${INVOICE_ID}/pay`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no Authorization header", async () => {
    const res = await app.request(PAY_URL, { method: "PATCH" });
    expect(res.status).toBe(401);
  });

  it("returns 403 when doctor tries to pay invoice", async () => {
    const res = await app.request(PAY_URL, {
      method: "PATCH",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when invoice does not exist", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);
    const res = await app.request(PAY_URL, {
      method: "PATCH",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when invoice is already paid", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([{ ...mockInvoice, status: "paid" }]) as any
    );
    const res = await app.request(PAY_URL, {
      method: "PATCH",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invoice is already paid");
  });

  it("returns 400 when invoice is cancelled", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([{ ...mockInvoice, status: "cancelled" }]) as any
    );
    const res = await app.request(PAY_URL, {
      method: "PATCH",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Cannot pay a cancelled invoice");
  });

  it("returns 200 and marks invoice as paid", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([{ ...mockInvoice }]) as any
    );

    const updatedInvoice = {
      ...mockInvoice,
      status: "paid",
      paidAt: new Date().toISOString(),
    };
    const returning = vi.fn().mockResolvedValue([updatedInvoice]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    vi.mocked(db.update).mockReturnValue({ set } as any);

    const res = await app.request(PAY_URL, {
      method: "PATCH",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("paid");
    expect(body.paidAt).toBeDefined();
  });

  it("returns 200 when patient pays own invoice", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(
        makeSelectChain([{ ...mockInvoice, patientId: PATIENT_ID }]) as any
      )
      .mockReturnValueOnce(makeSelectChain([{ id: PATIENT_ID }]) as any);

    const updatedInvoice = {
      ...mockInvoice,
      status: "paid",
      paidAt: new Date().toISOString(),
    };
    const returning = vi.fn().mockResolvedValue([updatedInvoice]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    vi.mocked(db.update).mockReturnValue({ set } as any);

    const res = await app.request(PAY_URL, {
      method: "PATCH",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
    });
    expect(res.status).toBe(200);
  });

  it("returns 403 when patient tries to pay another patient's invoice", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(
        makeSelectChain([
          { ...mockInvoice, patientId: "different-patient" },
        ]) as any
      )
      .mockReturnValueOnce(makeSelectChain([{ id: PATIENT_ID }]) as any);
    const res = await app.request(PAY_URL, {
      method: "PATCH",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
    });
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /invoices/:id/cancel ───────────────────────────────────────────────

describe("PATCH /invoices/:id/cancel", () => {
  const CANCEL_URL = `${INVOICES_URL}/${INVOICE_ID}/cancel`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no Authorization header", async () => {
    const res = await app.request(CANCEL_URL, { method: "PATCH" });
    expect(res.status).toBe(401);
  });

  it("returns 403 when patient tries to cancel invoice", async () => {
    const res = await app.request(CANCEL_URL, {
      method: "PATCH",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when doctor tries to cancel invoice", async () => {
    const res = await app.request(CANCEL_URL, {
      method: "PATCH",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when invoice does not exist", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);
    const res = await app.request(CANCEL_URL, {
      method: "PATCH",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when invoice is already paid", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([{ ...mockInvoice, status: "paid" }]) as any
    );
    const res = await app.request(CANCEL_URL, {
      method: "PATCH",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Cannot cancel a paid invoice");
  });

  it("returns 400 when invoice is already cancelled", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([{ ...mockInvoice, status: "cancelled" }]) as any
    );
    const res = await app.request(CANCEL_URL, {
      method: "PATCH",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invoice is already cancelled");
  });

  it("returns 200 and marks invoice as cancelled", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([{ ...mockInvoice }]) as any
    );

    const updatedInvoice = { ...mockInvoice, status: "cancelled" };
    const returning = vi.fn().mockResolvedValue([updatedInvoice]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    vi.mocked(db.update).mockReturnValue({ set } as any);

    const res = await app.request(CANCEL_URL, {
      method: "PATCH",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("cancelled");
  });
});
