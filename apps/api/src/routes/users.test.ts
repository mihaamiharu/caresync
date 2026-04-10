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

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

import { db } from "../db";

const ME_URL = "/api/v1/users/me";
const AVATAR_URL = "/api/v1/users/me/avatar";
const USERS_URL = "/api/v1/users";

const mockUser = {
  id: "user-uuid-123",
  email: "patient@caresync.com",
  role: "patient",
  firstName: "John",
  lastName: "Doe",
  phone: null,
  avatarUrl: null,
  isActive: true,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const mockAdminUser = {
  ...mockUser,
  id: "admin-uuid-999",
  email: "admin@caresync.com",
  role: "admin",
};

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

describe("GET /users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no Authorization header is provided", async () => {
    const res = await app.request(ME_URL);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Missing or invalid authorization header");
  });

  it("returns 401 when the token is invalid", async () => {
    const res = await app.request(ME_URL, {
      headers: bearer("not.a.valid.jwt"),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Invalid or expired token");
  });

  it("returns 401 when the token is expired", async () => {
    const { default: jwt } = await import("jsonwebtoken");
    const expired = jwt.sign(
      { userId: "user-uuid-123", role: "patient" },
      "dev-secret",
      { expiresIn: -1 }
    );
    const res = await app.request(ME_URL, { headers: bearer(expired) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Invalid or expired token");
  });

  it("returns 200 with the full user profile for a valid token", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([mockUser]) as any);
    const token = signAccessToken({ userId: "user-uuid-123", role: "patient" });

    const res = await app.request(ME_URL, { headers: bearer(token) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("user-uuid-123");
    expect(body.email).toBe("patient@caresync.com");
    expect(body.role).toBe("patient");
    expect(body.firstName).toBe("John");
    expect(body.lastName).toBe("Doe");
    expect(body.phone).toBeNull();
    expect(body.isActive).toBe(true);
    expect(body.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });
});

describe("PUT /users/me", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when no Authorization header is provided", async () => {
    const res = await app.request(ME_URL, { method: "PUT" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid", async () => {
    const token = signAccessToken({ userId: "user-uuid-123", role: "patient" });
    const res = await app.request(ME_URL, {
      method: "PUT",
      headers: { ...bearer(token), ...jsonHeaders },
      body: JSON.stringify({ firstName: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 200 with the updated user profile", async () => {
    const updatedUser = {
      ...mockUser,
      firstName: "Jane",
      lastName: "Smith",
      phone: "+1234567890",
      updatedAt: new Date("2024-06-01T00:00:00.000Z"),
    };
    vi.mocked(db.update).mockReturnValueOnce(makeUpdateChain([updatedUser]) as any);
    const token = signAccessToken({ userId: "user-uuid-123", role: "patient" });

    const res = await app.request(ME_URL, {
      method: "PUT",
      headers: { ...bearer(token), ...jsonHeaders },
      body: JSON.stringify({ firstName: "Jane", lastName: "Smith", phone: "+1234567890" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.firstName).toBe("Jane");
    expect(body.lastName).toBe("Smith");
    expect(body.phone).toBe("+1234567890");
  });
});

describe("PUT /users/me/avatar", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const res = await app.request(AVATAR_URL, { method: "PUT" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is provided", async () => {
    const token = signAccessToken({ userId: "user-uuid-123", role: "patient" });
    const form = new FormData();
    const res = await app.request(AVATAR_URL, {
      method: "PUT",
      headers: bearer(token),
      body: form,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/no file|avatar/i);
  });

  it("returns 200 with avatarUrl after successful upload", async () => {
    const updatedUser = { ...mockUser, avatarUrl: "/uploads/avatars/user-uuid-123-123.jpg" };
    vi.mocked(db.update).mockReturnValueOnce(makeUpdateChain([updatedUser]) as any);
    const token = signAccessToken({ userId: "user-uuid-123", role: "patient" });

    const form = new FormData();
    form.append("avatar", new File(["fake-image-data"], "photo.jpg", { type: "image/jpeg" }));

    const res = await app.request(AVATAR_URL, {
      method: "PUT",
      headers: bearer(token),
      body: form,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.avatarUrl).toMatch(/\/uploads\/avatars\//);
  });
});

describe("GET /users (admin list)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const res = await app.request(USERS_URL);
    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated as non-admin", async () => {
    const token = signAccessToken({ userId: "user-uuid-123", role: "patient" });
    const res = await app.request(USERS_URL, { headers: bearer(token) });
    expect(res.status).toBe(403);
  });

  it("returns 200 with paginated user list for admin", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeCountChain(1) as any)
      .mockReturnValueOnce(makeListChain([mockUser]) as any);

    const token = signAccessToken({ userId: "admin-uuid-999", role: "admin" });
    const res = await app.request(`${USERS_URL}?page=1&limit=10`, {
      headers: bearer(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(10);
    expect(body.totalPages).toBe(1);
  });
});

describe("PATCH /users/:id/status (admin)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const res = await app.request(`${USERS_URL}/user-uuid-123/status`, {
      method: "PATCH",
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated as non-admin", async () => {
    const token = signAccessToken({ userId: "user-uuid-123", role: "patient" });
    const res = await app.request(`${USERS_URL}/user-uuid-123/status`, {
      method: "PATCH",
      headers: { ...bearer(token), ...jsonHeaders },
      body: JSON.stringify({ isActive: false }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 with the updated user after status change", async () => {
    const deactivatedUser = { ...mockUser, isActive: false };
    vi.mocked(db.update).mockReturnValueOnce(makeUpdateChain([deactivatedUser]) as any);

    const token = signAccessToken({ userId: "admin-uuid-999", role: "admin" });
    const res = await app.request(`${USERS_URL}/user-uuid-123/status`, {
      method: "PATCH",
      headers: { ...bearer(token), ...jsonHeaders },
      body: JSON.stringify({ isActive: false }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isActive).toBe(false);
  });

  it("returns 404 when user does not exist", async () => {
    vi.mocked(db.update).mockReturnValueOnce(makeUpdateChain([]) as any);

    const token = signAccessToken({ userId: "admin-uuid-999", role: "admin" });
    const res = await app.request(`${USERS_URL}/nonexistent-id/status`, {
      method: "PATCH",
      headers: { ...bearer(token), ...jsonHeaders },
      body: JSON.stringify({ isActive: false }),
    });

    expect(res.status).toBe(404);
  });
});
