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

const BASE = "/api/v1/departments";

const mockDept = {
  id: "dept-uuid-001",
  name: "Cardiology",
  description: "Heart-related care",
  imageUrl: null,
  isActive: true,
};

// ─── Mock chain helpers ────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from };
}

function makeCountChain(total: number) {
  const where = vi.fn().mockResolvedValue([{ total }]);
  const from = vi.fn().mockReturnValue({ where });
  return { from };
}

function makeListChain(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const offset = vi.fn().mockReturnValue({ limit });
  const orderBy = vi.fn().mockReturnValue({ offset });
  const where = vi.fn().mockReturnValue({ orderBy });
  const from = vi.fn().mockReturnValue({ where });
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

function makeDeleteChain(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ returning });
  return { where };
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

const jsonHeaders = { "Content-Type": "application/json" };

// ─── GET /departments ──────────────────────────────────────────────────────────

describe("GET /departments", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 401 when not authenticated", async () => {
    const res = await app.request(BASE);
    expect(res.status).toBe(401);
  });

  it("returns 200 with paginated list for any authenticated user", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeCountChain(1) as any)
      .mockReturnValueOnce(makeListChain([mockDept]) as any);

    const token = signAccessToken({ userId: "user-uuid-123", role: "patient" });
    const res = await app.request(`${BASE}?page=1&limit=10`, { headers: bearer(token) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Cardiology");
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(10);
    expect(body.totalPages).toBe(1);
  });

  it("supports search by name", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeCountChain(1) as any)
      .mockReturnValueOnce(makeListChain([mockDept]) as any);

    const token = signAccessToken({ userId: "user-uuid-123", role: "patient" });
    const res = await app.request(`${BASE}?search=cardio`, { headers: bearer(token) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

// ─── GET /departments/:id ──────────────────────────────────────────────────────

describe("GET /departments/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 401 when not authenticated", async () => {
    const res = await app.request(`${BASE}/dept-uuid-001`);
    expect(res.status).toBe(401);
  });

  it("returns 200 with department for authenticated user", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([mockDept]) as any);

    const token = signAccessToken({ userId: "user-uuid-123", role: "patient" });
    const res = await app.request(`${BASE}/dept-uuid-001`, { headers: bearer(token) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("dept-uuid-001");
    expect(body.name).toBe("Cardiology");
  });

  it("returns 404 when department does not exist", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);

    const token = signAccessToken({ userId: "user-uuid-123", role: "patient" });
    const res = await app.request(`${BASE}/nonexistent`, { headers: bearer(token) });

    expect(res.status).toBe(404);
  });
});

// ─── POST /departments (admin) ────────────────────────────────────────────────

describe("POST /departments", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 401 when not authenticated", async () => {
    const res = await app.request(BASE, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ name: "Neurology" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated as non-admin", async () => {
    const token = signAccessToken({ userId: "user-uuid-123", role: "patient" });
    const res = await app.request(BASE, {
      method: "POST",
      headers: { ...bearer(token), ...jsonHeaders },
      body: JSON.stringify({ name: "Neurology" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is missing", async () => {
    const token = signAccessToken({ userId: "admin-uuid-999", role: "admin" });
    const res = await app.request(BASE, {
      method: "POST",
      headers: { ...bearer(token), ...jsonHeaders },
      body: JSON.stringify({ description: "No name provided" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 201 with the created department for admin", async () => {
    const newDept = { ...mockDept, id: "dept-uuid-002", name: "Neurology" };
    vi.mocked(db.insert).mockReturnValueOnce(makeInsertChain([newDept]) as any);

    const token = signAccessToken({ userId: "admin-uuid-999", role: "admin" });
    const res = await app.request(BASE, {
      method: "POST",
      headers: { ...bearer(token), ...jsonHeaders },
      body: JSON.stringify({ name: "Neurology", description: "Brain and nervous system" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Neurology");
    expect(body.id).toBe("dept-uuid-002");
  });
});

// ─── PUT /departments/:id (admin) ─────────────────────────────────────────────

describe("PUT /departments/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 401 when not authenticated", async () => {
    const res = await app.request(`${BASE}/dept-uuid-001`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({ name: "Updated" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    const token = signAccessToken({ userId: "user-uuid-123", role: "patient" });
    const res = await app.request(`${BASE}/dept-uuid-001`, {
      method: "PUT",
      headers: { ...bearer(token), ...jsonHeaders },
      body: JSON.stringify({ name: "Updated" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when department not found", async () => {
    vi.mocked(db.update).mockReturnValueOnce(makeUpdateChain([]) as any);

    const token = signAccessToken({ userId: "admin-uuid-999", role: "admin" });
    const res = await app.request(`${BASE}/nonexistent`, {
      method: "PUT",
      headers: { ...bearer(token), ...jsonHeaders },
      body: JSON.stringify({ name: "Updated" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 with updated department for admin", async () => {
    const updated = { ...mockDept, name: "Cardiology Updated", description: "Updated desc" };
    vi.mocked(db.update).mockReturnValueOnce(makeUpdateChain([updated]) as any);

    const token = signAccessToken({ userId: "admin-uuid-999", role: "admin" });
    const res = await app.request(`${BASE}/dept-uuid-001`, {
      method: "PUT",
      headers: { ...bearer(token), ...jsonHeaders },
      body: JSON.stringify({ name: "Cardiology Updated", description: "Updated desc" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Cardiology Updated");
    expect(body.description).toBe("Updated desc");
  });
});

// ─── DELETE /departments/:id (admin) ─────────────────────────────────────────

describe("DELETE /departments/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 401 when not authenticated", async () => {
    const res = await app.request(`${BASE}/dept-uuid-001`, { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    const token = signAccessToken({ userId: "user-uuid-123", role: "patient" });
    const res = await app.request(`${BASE}/dept-uuid-001`, {
      method: "DELETE",
      headers: bearer(token),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when department not found", async () => {
    vi.mocked(db.delete).mockReturnValueOnce(makeDeleteChain([]) as any);

    const token = signAccessToken({ userId: "admin-uuid-999", role: "admin" });
    const res = await app.request(`${BASE}/nonexistent`, {
      method: "DELETE",
      headers: bearer(token),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 after successful delete for admin", async () => {
    vi.mocked(db.delete).mockReturnValueOnce(makeDeleteChain([mockDept]) as any);

    const token = signAccessToken({ userId: "admin-uuid-999", role: "admin" });
    const res = await app.request(`${BASE}/dept-uuid-001`, {
      method: "DELETE",
      headers: bearer(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/deleted/i);
  });
});
