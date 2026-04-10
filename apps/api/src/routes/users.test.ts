import { describe, it, expect, vi, beforeEach } from "vitest";
import { app } from "../app";
import { signAccessToken } from "../lib/jwt";

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("../lib/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("$2a$10$mocked-hash"),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

import { db } from "../db";

const ME_URL = "/api/v1/users/me";

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

function makeSelectChain(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from };
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

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
