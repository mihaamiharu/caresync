import { describe, it, expect, vi, beforeEach } from "vitest";
import { app } from "../app";
import { signAccessToken } from "../lib/jwt";

vi.mock("../db", () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn((cb) => cb(mockDb)),
  };
  return { db: mockDb };
});

import { db } from "../db";

const BASE = "/api/v1/doctors";

const mockDoctor = {
  id: "00000000-0000-0000-0000-000000000001",
  userId: "00000000-0000-0000-0000-000000000101",
  departmentId: "00000000-0000-0000-0000-000000000201",
  specialization: "Cardiology",
  bio: "Experienced cardiologist",
  licenseNumber: "LIC123",
  user: {
    id: "00000000-0000-0000-0000-000000000101",
    email: "doctor@example.com",
    role: "doctor",
    firstName: "John",
    lastName: "Smith",
    phone: "+123456789",
    avatarUrl: null,
  },
  department: {
    id: "00000000-0000-0000-0000-000000000201",
    name: "Cardiology",
  },
};

// ─── Mock chain helpers ────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const innerJoin = vi
    .fn()
    .mockReturnValue({ innerJoin: vi.fn().mockReturnValue({ where, limit }) });
  const from = vi.fn().mockReturnValue({ innerJoin });
  return { from };
}

function makeCountChain(total: number) {
  const where = vi.fn().mockResolvedValue([{ total }]);
  const from = vi
    .fn()
    .mockReturnValue({ innerJoin: vi.fn().mockReturnValue({ where }) });
  return { from };
}

function makeListChain(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const offset = vi.fn().mockReturnValue({ limit });
  const orderBy = vi.fn().mockReturnValue({ offset });
  const where = vi.fn().mockReturnValue({ orderBy });
  const innerJoin = vi.fn().mockReturnValue({
    innerJoin: vi.fn().mockReturnValue({ where, orderBy }),
  });
  const from = vi.fn().mockReturnValue({ innerJoin });
  return { from };
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

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

const jsonHeaders = { "Content-Type": "application/json" };

// ─── GET /doctors ─────────────────────────────────────────────────────────────

describe("GET /doctors", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 200 with paginated list for anyone", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeCountChain(1) as any)
      .mockReturnValueOnce(makeListChain([mockDoctor]) as any);

    const res = await app.request(`${BASE}?page=1&limit=10`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].user.firstName).toBe("John");
    expect(body.total).toBe(1);
  });
});

// ─── GET /doctors/:id ──────────────────────────────────────────────────────────

describe("GET /doctors/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 200 with doctor for anyone", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([mockDoctor]) as any
    );

    const res = await app.request(
      `${BASE}/00000000-0000-0000-0000-000000000001`
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("00000000-0000-0000-0000-000000000001");
    expect(body.user.lastName).toBe("Smith");
  });

  it("returns 404 when doctor does not exist", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);

    const res = await app.request(
      `${BASE}/00000000-0000-0000-0000-ffffffffffff`
    );
    expect(res.status).toBe(404);
  });
});

// ─── POST /doctors (admin) ───────────────────────────────────────────────────

describe("POST /doctors", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-setup transaction mock because resetAllMocks might have cleared it
    (db.transaction as any).mockImplementation((cb: any) => cb(db));
  });

  it("returns 401 when not authenticated", async () => {
    const res = await app.request(BASE, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    const token = signAccessToken({ userId: "user-uuid-123", role: "patient" });
    const res = await app.request(BASE, {
      method: "POST",
      headers: { ...bearer(token), ...jsonHeaders },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(403);
  });

  it("returns 201 and creates doctor for admin", async () => {
    const token = signAccessToken({
      userId: "00000000-0000-0000-0000-000000000999",
      role: "admin",
    });

    // 1. Check existing user
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi
          .fn()
          .mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
      }),
    } as any);
    // 2. Check existing doctor (license)
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi
          .fn()
          .mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
      }),
    } as any);

    // 3. Insert user
    vi.mocked(db.insert).mockReturnValueOnce(
      makeInsertChain([
        {
          id: "00000000-0000-0000-0000-000000000102",
          email: "new@example.com",
        },
      ]) as any
    );
    // 4. Insert doctor
    vi.mocked(db.insert).mockReturnValueOnce(
      makeInsertChain([
        {
          id: "00000000-0000-0000-0000-000000000002",
          userId: "00000000-0000-0000-0000-000000000102",
        },
      ]) as any
    );

    const res = await app.request(BASE, {
      method: "POST",
      headers: { ...bearer(token), ...jsonHeaders },
      body: JSON.stringify({
        email: "new@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Doe",
        departmentId: "00000000-0000-0000-0000-000000000201",
        specialization: "Neurology",
        licenseNumber: "LIC456",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("00000000-0000-0000-0000-000000000002");
  });
});

// ─── PUT /doctors/:id ──────────────────────────────────────────────────────────

describe("PUT /doctors/:id", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (db.transaction as any).mockImplementation((cb: any) => cb(db));
  });

  it("returns 403 if not admin and not the same doctor", async () => {
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockDoctor]),
        }),
      }),
    } as any);

    const token = signAccessToken({
      userId: "00000000-0000-0000-0000-000000000888",
      role: "doctor",
    });
    const res = await app.request(
      `${BASE}/00000000-0000-0000-0000-000000000001`,
      {
        method: "PUT",
        headers: { ...bearer(token), ...jsonHeaders },
        body: JSON.stringify({ specialization: "Updated" }),
      }
    );

    expect(res.status).toBe(403);
  });

  it("returns 200 and updates for admin", async () => {
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockDoctor]),
        }),
      }),
    } as any);
    vi.mocked(db.update).mockReturnValueOnce(makeUpdateChain([]) as any); // user update
    vi.mocked(db.update).mockReturnValueOnce(
      makeUpdateChain([{ ...mockDoctor, specialization: "Updated" }]) as any
    ); // doctor update
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([{ ...mockDoctor, specialization: "Updated" }]) as any
    ); // full fetch

    const token = signAccessToken({
      userId: "00000000-0000-0000-0000-000000000999",
      role: "admin",
    });
    const res = await app.request(
      `${BASE}/00000000-0000-0000-0000-000000000001`,
      {
        method: "PUT",
        headers: { ...bearer(token), ...jsonHeaders },
        body: JSON.stringify({
          specialization: "Updated",
          departmentId: "00000000-0000-0000-0000-000000000201",
        }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.specialization).toBe("Updated");
  });

  it("does NOT update specialization if requester is NOT admin", async () => {
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi
        .fn()
        .mockReturnValue({
          where: vi
            .fn()
            .mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockDoctor]),
            }),
        }),
    } as any);
    vi.mocked(db.update).mockReturnValueOnce(makeUpdateChain([]) as any); // user update
    vi.mocked(db.update).mockReturnValueOnce(
      makeUpdateChain([mockDoctor]) as any
    ); // doctor update (no change)
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([mockDoctor]) as any
    ); // full fetch

    const token = signAccessToken({
      userId: mockDoctor.userId,
      role: "doctor",
    });
    const res = await app.request(`${BASE}/${mockDoctor.id}`, {
      method: "PUT",
      headers: { ...bearer(token), ...jsonHeaders },
      body: JSON.stringify({ specialization: "I want to be a Surgeon" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.specialization).toBe(mockDoctor.specialization); // Still Cardiology
  });
});

// ─── DELETE /doctors/:id ──────────────────────────────────────────────────────

describe("DELETE /doctors/:id", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (db.transaction as any).mockImplementation((cb: any) => cb(db));
  });

  it("returns 400 if doctor has appointments", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: vi
          .fn()
          .mockReturnValue({
            where: vi
              .fn()
              .mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockDoctor]),
              }),
          }),
      } as any) // find doctor
      .mockReturnValueOnce({
        from: vi
          .fn()
          .mockReturnValue({
            where: vi
              .fn()
              .mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: "appt-1" }]),
              }),
          }),
      } as any); // find appointment

    const token = signAccessToken({ userId: "admin-999", role: "admin" });
    const res = await app.request(`${BASE}/${mockDoctor.id}`, {
      method: "DELETE",
      headers: bearer(token),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/appointments/i);
  });

  it("returns 200 and deactivates user (soft delete) if no records", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: vi
          .fn()
          .mockReturnValue({
            where: vi
              .fn()
              .mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockDoctor]),
              }),
          }),
      } as any) // find doctor
      .mockReturnValueOnce({
        from: vi
          .fn()
          .mockReturnValue({
            where: vi
              .fn()
              .mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
          }),
      } as any) // no appointments
      .mockReturnValueOnce({
        from: vi
          .fn()
          .mockReturnValue({
            where: vi
              .fn()
              .mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
          }),
      } as any); // no records

    vi.mocked(db.update).mockReturnValueOnce(
      makeUpdateChain([{ ...mockDoctor.user, isActive: false }]) as any
    );

    const token = signAccessToken({ userId: "admin-999", role: "admin" });
    const res = await app.request(`${BASE}/${mockDoctor.id}`, {
      method: "DELETE",
      headers: bearer(token),
    });

    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalled();
  });
});
