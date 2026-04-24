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

const ADMIN_STATS_URL = "/api/v1/admin/stats";

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

describe("GET /admin/stats", () => {
  it("returns 401 when no Authorization header is provided", async () => {
    const res = await app.request(ADMIN_STATS_URL, { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("returns 403 when called by patient", async () => {
    const res = await app.request(ADMIN_STATS_URL, {
      method: "GET",
      headers: bearer(patientToken),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toBe("Insufficient permissions");
  });

  it("returns 403 when called by doctor", async () => {
    const res = await app.request(ADMIN_STATS_URL, {
      method: "GET",
      headers: bearer(doctorToken),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toBe("Insufficient permissions");
  });

  it("returns 500 when database throws an error", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const res = await app.request(ADMIN_STATS_URL, {
      method: "GET",
      headers: bearer(adminToken),
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toBe("Failed to load stats");
  });
});