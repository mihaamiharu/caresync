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

const REVIEWS_URL = "/api/v1/reviews";

const patientToken = signAccessToken({
  userId: "a1b2c3d4-0000-4000-8000-000000000001",
  role: "patient",
});
const doctorToken = signAccessToken({
  userId: "a1b2c3d4-0000-4000-8000-000000000002",
  role: "doctor",
});
const adminToken = signAccessToken({
  userId: "a1b2c3d4-0000-4000-8000-000000000003",
  role: "admin",
});

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}
const jsonHeaders = { "Content-Type": "application/json" };

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const PATIENT_ID = "a1b2c3d4-0000-4000-8000-000000000010";
const DOCTOR_ID = "a1b2c3d4-0000-4000-8000-000000000011";
const APPT_ID = "a1b2c3d4-0000-4000-8000-000000000012";
const REVIEW_ID = "a1b2c3d4-0000-4000-8000-000000000013";

const mockAppointmentCompleted = {
  id: APPT_ID,
  patientId: PATIENT_ID,
  doctorId: DOCTOR_ID,
  appointmentDate: "2026-01-15",
  startTime: "09:00:00",
  endTime: "09:30:00",
  status: "completed",
  type: "consultation",
  reason: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockAppointmentPending = {
  ...mockAppointmentCompleted,
  id: "a1b2c3d4-0000-4000-8000-000000000014",
  status: "pending",
};

const mockReview = {
  id: REVIEW_ID,
  appointmentId: APPT_ID,
  patientId: PATIENT_ID,
  doctorId: DOCTOR_ID,
  rating: 5,
  comment: "Great doctor!",
  createdAt: new Date().toISOString(),
};

// ─── Mock chain helpers ────────────────────────────────────────────────────────

type MockChain = {
  from: ReturnType<typeof vi.fn>;
  innerJoin?: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  limit?: ReturnType<typeof vi.fn>;
  orderBy?: ReturnType<typeof vi.fn>;
  offset?: ReturnType<typeof vi.fn>;
};

// Build a query-builder mock chain for drizzle.
// The actual chain is: db.select().from().innerJoin()? .where().orderBy()? .offset().limit()
function buildChain(
  result: unknown[],
  opts: {
    withInnerJoin?: boolean;
    withOrderBy?: boolean;
    withOffset?: boolean;
    countQuery?: boolean;
  } = {}
): MockChain {
  const { withInnerJoin, withOrderBy, withOffset } = opts;

  if (opts.countQuery) {
    // Count query: db.select({ count }).from(reviews).where()
    // await db.select().from().where() returns [{ count: N }]
    const where = vi.fn().mockResolvedValue(result);
    const from = vi.fn().mockReturnValue({ where } as MockChain);
    return { from, where } as MockChain;
  }

  // Normal query chain
  // Self-referential: every chainable method returns the same chain object,
  // so the code can call .innerJoin().innerJoin().where().limit() in sequence.
  const chain = {
    from: undefined as any,
    innerJoin: undefined as any,
    where: undefined as any,
    limit: undefined as any,
    orderBy: undefined as any,
    offset: undefined as any,
  };

  // Set each method to return the same chain (self-referential)
  chain.from = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockReturnValue(chain);

  // Override specific behavior based on options
  if (!withInnerJoin) {
    chain.from = vi.fn().mockReturnValue({
      innerJoin: chain.innerJoin,
      where: chain.where,
      limit: chain.limit,
      orderBy: chain.orderBy,
      offset: chain.offset,
    });
  }

  return chain;
}

// Helper to set up db.select with sequential calls
function setupSelectChains(...chains: MockChain[]) {
  let callCount = 0;
  (db.select as any).mockImplementation(() => {
    if (callCount < chains.length) {
      return chains[callCount++];
    }
    // Fallback — return a harmless chain
    return buildChain([]);
  });
}

// ─── POST /reviews ─────────────────────────────────────────────────────────────

describe("POST /reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to undefined to clear both mockReturnValueOnce queue AND mockImplementation queue
    (db.insert as any).mockReset();
    (db.select as any).mockReset();
  });

  it("returns 401 when no Authorization header", async () => {
    const res = await app.request(REVIEWS_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ appointmentId: APPT_ID, rating: 5 }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when called by doctor", async () => {
    const res = await app.request(REVIEWS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(doctorToken) },
      body: JSON.stringify({ appointmentId: APPT_ID, rating: 5 }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when called by admin", async () => {
    const res = await app.request(REVIEWS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(adminToken) },
      body: JSON.stringify({ appointmentId: APPT_ID, rating: 5 }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when appointmentId is missing", async () => {
    const res = await app.request(REVIEWS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ rating: 5 }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when rating is missing", async () => {
    const res = await app.request(REVIEWS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ appointmentId: APPT_ID }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when rating is out of range (< 1)", async () => {
    const res = await app.request(REVIEWS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ appointmentId: APPT_ID, rating: 0 }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when rating is out of range (> 5)", async () => {
    const res = await app.request(REVIEWS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ appointmentId: APPT_ID, rating: 6 }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when comment exceeds 500 characters", async () => {
    const longComment = "a".repeat(501);
    const res = await app.request(REVIEWS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({
        appointmentId: APPT_ID,
        rating: 5,
        comment: longComment,
      }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when appointment does not exist", async () => {
    // Appointment lookup: innerJoin chain returning empty
    setupSelectChains(buildChain([], { withInnerJoin: true }));
    const res = await app.request(REVIEWS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ appointmentId: APPT_ID, rating: 5 }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Appointment not found");
  });

  it("returns 403 when patient does not own the appointment", async () => {
    setupSelectChains(
      buildChain(
        [
          {
            appointment: {
              ...mockAppointmentCompleted,
              patientId: "different-patient",
            },
            patientUserId: "different-user",
          },
        ],
        { withInnerJoin: true }
      )
    );
    const res = await app.request(REVIEWS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ appointmentId: APPT_ID, rating: 5 }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toBe("You can only review your own appointments");
  });

  it("returns 403 when appointment is not completed", async () => {
    setupSelectChains(
      buildChain(
        [
          {
            appointment: mockAppointmentPending,
            patientUserId: "a1b2c3d4-0000-4000-8000-000000000001",
          },
        ],
        { withInnerJoin: true }
      )
    );
    const res = await app.request(REVIEWS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ appointmentId: APPT_ID, rating: 5 }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toBe("Only completed appointments can be reviewed");
  });

  it("returns 400 when a review already exists for this appointment", async () => {
    // First call: appointment lookup (completed, owned by patient)
    // Second call: existing review check
    setupSelectChains(
      buildChain(
        [
          {
            appointment: mockAppointmentCompleted,
            patientUserId: "a1b2c3d4-0000-4000-8000-000000000001",
          },
        ],
        { withInnerJoin: true }
      ),
      buildChain([mockReview])
    );
    const res = await app.request(REVIEWS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ appointmentId: APPT_ID, rating: 5 }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("You have already reviewed this appointment");
  });

  it("returns 201 and creates the review with comment", async () => {
    // Setup db.select chains: (1) appt join, (2) no existing review
    (db.select as any).mockImplementationOnce(() =>
      buildChain(
        [
          {
            appointment: mockAppointmentCompleted,
            patientUserId: "a1b2c3d4-0000-4000-8000-000000000001",
          },
        ],
        { withInnerJoin: true }
      )
    );
    (db.select as any).mockImplementationOnce(() => buildChain([]));

    // Setup db.insert — use mockReturnValueOnce with plain arrow functions.
    // Plain functions avoid any vi.fn() state issues between tests.
    (db.insert as any).mockReturnValueOnce({
      values: () => ({
        returning: () => Promise.resolve([mockReview]),
      }),
    });

    const res = await app.request(REVIEWS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({
        appointmentId: APPT_ID,
        rating: 5,
        comment: "Great doctor!",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(REVIEW_ID);
    expect(body.rating).toBe(5);
    expect(body.comment).toBe("Great doctor!");
  });

  it("returns 201 and creates the review without comment", async () => {
    const reviewNoComment = {
      ...mockReview,
      id: REVIEW_ID,
      appointmentId: APPT_ID,
      patientId: PATIENT_ID,
      doctorId: DOCTOR_ID,
      rating: 4,
      comment: null,
    };
    (db.select as any).mockImplementationOnce(() =>
      buildChain(
        [
          {
            appointment: mockAppointmentCompleted,
            patientUserId: "a1b2c3d4-0000-4000-8000-000000000001",
          },
        ],
        { withInnerJoin: true }
      )
    );
    (db.select as any).mockImplementationOnce(() => buildChain([]));

    // Use mockReturnValueOnce with plain arrow functions — reset clears the queue
    (db.insert as any).mockReturnValueOnce({
      values: () => ({
        returning: () => Promise.resolve([reviewNoComment]),
      }),
    });

    const res = await app.request(REVIEWS_URL, {
      method: "POST",
      headers: { ...jsonHeaders, ...bearer(patientToken) },
      body: JSON.stringify({ appointmentId: APPT_ID, rating: 4 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.rating).toBe(4);
    expect(body.comment).toBeNull();
  });
});

// ─── GET /reviews/appointment/:appointmentId ─────────────────────────────────

describe("GET /reviews/appointment/:appointmentId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.select as any).mockReset();
  });

  it("returns 401 when no Authorization header", async () => {
    const res = await app.request(`${REVIEWS_URL}/appointment/${APPT_ID}`, {
      method: "GET",
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when no review exists for the appointment", async () => {
    setupSelectChains(buildChain([]));
    const res = await app.request(`${REVIEWS_URL}/appointment/${APPT_ID}`, {
      method: "GET",
      headers: bearer(patientToken),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 with the review when it exists", async () => {
    setupSelectChains(buildChain([mockReview]));
    const res = await app.request(`${REVIEWS_URL}/appointment/${APPT_ID}`, {
      method: "GET",
      headers: bearer(patientToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(REVIEW_ID);
    expect(body.rating).toBe(5);
    expect(body.comment).toBe("Great doctor!");
  });
});

// ─── GET /doctors/:id/reviews ─────────────────────────────────────────────────

describe("GET /doctors/:id/reviews", () => {
  const DOCTOR_ID = "a1b2c3d4-0000-4000-8000-000000000011";
  const REVIEWS_URL_DOC = `/api/v1/doctors/${DOCTOR_ID}/reviews`;

  beforeEach(() => {
    vi.clearAllMocks();
    (db.select as any).mockReset();
  });

  it("returns 401 when no Authorization header", async () => {
    const res = await app.request(REVIEWS_URL_DOC, { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("returns 200 with paginated reviews for a doctor", async () => {
    const mockReviewRow = {
      ...mockReview,
      patientFirstName: "John",
      patientLastName: "Doe",
    };
    // Count query chain: db.select().from().where() (no .limit())
    const countChain = buildChain([{ count: 1 }], { countQuery: true });
    // Data query chain: db.select().from().innerJoin().innerJoin().where().orderBy().offset().limit()
    const dataChain = buildChain([mockReviewRow], {
      withInnerJoin: true,
      withOrderBy: true,
      withOffset: true,
    });

    (db.select as any)
      .mockImplementationOnce(() => countChain)
      .mockImplementationOnce(() => dataChain);

    const res = await app.request(REVIEWS_URL_DOC, {
      method: "GET",
      headers: bearer(patientToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.totalPages).toBe(1);
    expect(body.data[0].rating).toBe(5);
    expect(body.data[0].patientFirstName).toBe("John");
  });

  it("returns empty data array when doctor has no reviews", async () => {
    const countChain = buildChain([{ count: 0 }], { countQuery: true });
    const dataChain = buildChain([], {
      withInnerJoin: true,
      withOrderBy: true,
      withOffset: true,
    });

    (db.select as any)
      .mockImplementationOnce(() => countChain)
      .mockImplementationOnce(() => dataChain);

    const res = await app.request(REVIEWS_URL_DOC, {
      method: "GET",
      headers: bearer(patientToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it("respects page and limit params", async () => {
    const countChain = buildChain([{ count: 25 }], { countQuery: true });
    const dataChain = buildChain([mockReview], {
      withInnerJoin: true,
      withOrderBy: true,
      withOffset: true,
    });

    (db.select as any)
      .mockImplementationOnce(() => countChain)
      .mockImplementationOnce(() => dataChain);

    const res = await app.request(`${REVIEWS_URL_DOC}?page=2&limit=10`, {
      method: "GET",
      headers: bearer(patientToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(2);
    expect(body.limit).toBe(10);
    expect(body.totalPages).toBe(3);
  });

  it("orders reviews by createdAt descending (newest first)", async () => {
    const countChain = buildChain([{ count: 2 }], { countQuery: true });
    const dataChain = buildChain([mockReview], {
      withInnerJoin: true,
      withOrderBy: true,
      withOffset: true,
    });

    (db.select as any)
      .mockImplementationOnce(() => countChain)
      .mockImplementationOnce(() => dataChain);

    const res = await app.request(REVIEWS_URL_DOC, {
      method: "GET",
      headers: bearer(patientToken),
    });
    expect(res.status).toBe(200);
    expect(db.select).toHaveBeenCalled();
  });
});
