import { describe, it, expect, vi, beforeEach } from "vitest";
import { app } from "../app";

// Mock the database to avoid needing a real PostgreSQL connection
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

// Mock bcrypt operations — no need to run real hashing in unit tests
vi.mock("../lib/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("$2a$10$mocked-hash"),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

import { db } from "../db";
import { verifyPassword } from "../lib/password";

const REGISTER_URL = "/api/v1/auth/register";
const LOGIN_URL = "/api/v1/auth/login";
const REFRESH_URL = "/api/v1/auth/refresh";
const LOGOUT_URL = "/api/v1/auth/logout";

const mockUser = {
  id: "user-uuid-123",
  email: "patient@caresync.com",
  role: "patient",
  firstName: "John",
  lastName: "Doe",
  passwordHash: "$2a$10$mocked-hash",
  phone: null,
  isActive: true,
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Helpers to build drizzle's chainable query mocks
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

function makeInsertVoid() {
  const values = vi.fn().mockResolvedValue([]);
  return { values };
}

const jsonBody = (body: object) =>
  JSON.stringify(body);

const jsonHeaders = { "Content-Type": "application/json" };

describe("POST /auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a user and returns 201 with accessToken and user info", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);
    vi.mocked(db.insert)
      .mockReturnValueOnce(makeInsertWithReturning([mockUser]) as any)
      .mockReturnValueOnce(makeInsertVoid() as any);

    const res = await app.request(REGISTER_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: jsonBody({ email: "patient@caresync.com", password: "password123", firstName: "John", lastName: "Doe" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.accessToken).toBeDefined();
    expect(body.user.id).toBe("user-uuid-123");
    expect(body.user.email).toBe("patient@caresync.com");
    expect(body.user.role).toBe("patient");
    expect(body.user.firstName).toBe("John");
    expect(body.user.lastName).toBe("Doe");
  });

  it("sets an httpOnly refreshToken cookie on successful register", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);
    vi.mocked(db.insert)
      .mockReturnValueOnce(makeInsertWithReturning([mockUser]) as any)
      .mockReturnValueOnce(makeInsertVoid() as any);

    const res = await app.request(REGISTER_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: jsonBody({ email: "patient@caresync.com", password: "password123", firstName: "John", lastName: "Doe" }),
    });

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("refreshToken=");
    expect(setCookie?.toLowerCase()).toContain("httponly");
  });

  it("returns 409 when the email is already registered", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([{ id: "existing-user" }]) as any
    );

    const res = await app.request(REGISTER_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: jsonBody({ email: "patient@caresync.com", password: "password123", firstName: "John", lastName: "Doe" }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toBe("Email already registered");
  });

  it("returns 400 for an invalid email format", async () => {
    const res = await app.request(REGISTER_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: jsonBody({ email: "not-an-email", password: "password123", firstName: "John", lastName: "Doe" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when password is shorter than 6 characters", async () => {
    const res = await app.request(REGISTER_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: jsonBody({ email: "patient@caresync.com", password: "123", firstName: "John", lastName: "Doe" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when firstName is missing", async () => {
    const res = await app.request(REGISTER_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: jsonBody({ email: "patient@caresync.com", password: "password123", lastName: "Doe" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with accessToken and sets refresh cookie on valid credentials", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([mockUser]) as any);
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);

    const res = await app.request(LOGIN_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: jsonBody({ email: "patient@caresync.com", password: "password123" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toBeDefined();
    expect(body.user.email).toBe("patient@caresync.com");
    expect(res.headers.get("set-cookie")).toContain("refreshToken=");
  });

  it("returns 401 when no user exists for the given email", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);

    const res = await app.request(LOGIN_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: jsonBody({ email: "nobody@caresync.com", password: "password123" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Invalid email or password");
  });

  it("returns 401 when password is incorrect", async () => {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([mockUser]) as any);
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    const res = await app.request(LOGIN_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: jsonBody({ email: "patient@caresync.com", password: "wrong-password" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Invalid email or password");
  });

  it("returns 401 when the account is deactivated", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([{ ...mockUser, isActive: false }]) as any
    );

    const res = await app.request(LOGIN_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: jsonBody({ email: "patient@caresync.com", password: "password123" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Account is deactivated");
  });

  it("returns 400 for missing email", async () => {
    const res = await app.request(LOGIN_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: jsonBody({ password: "password123" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/refresh", () => {
  async function getRefreshToken(): Promise<string> {
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([mockUser]) as any);
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);
    const loginRes = await app.request(LOGIN_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: jsonBody({ email: "patient@caresync.com", password: "password123" }),
    });
    const setCookie = loginRes.headers.get("set-cookie") ?? "";
    return setCookie.match(/refreshToken=([^;]+)/)?.[1] ?? "";
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with a new accessToken when user is active", async () => {
    const refreshToken = await getRefreshToken();
    // refresh handler checks user still exists and is active
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([mockUser]) as any);

    const res = await app.request(REFRESH_URL, {
      method: "POST",
      headers: { Cookie: `refreshToken=${refreshToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toBeDefined();
  });

  it("returns 401 when the user no longer exists", async () => {
    const refreshToken = await getRefreshToken();
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);

    const res = await app.request(REFRESH_URL, {
      method: "POST",
      headers: { Cookie: `refreshToken=${refreshToken}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Invalid refresh token");
  });

  it("returns 401 when the user account is deactivated", async () => {
    const refreshToken = await getRefreshToken();
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([{ ...mockUser, isActive: false }]) as any
    );

    const res = await app.request(REFRESH_URL, {
      method: "POST",
      headers: { Cookie: `refreshToken=${refreshToken}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Invalid refresh token");
  });

  it("returns 401 when no refresh cookie is present", async () => {
    const res = await app.request(REFRESH_URL, { method: "POST" });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("No refresh token");
  });

  it("returns 401 when the refresh token is tampered", async () => {
    const res = await app.request(REFRESH_URL, {
      method: "POST",
      headers: { Cookie: "refreshToken=invalid.token.here" },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Invalid refresh token");
  });
});

describe("POST /auth/logout", () => {
  it("returns 200 and clears the refresh cookie", async () => {
    const res = await app.request(LOGOUT_URL, { method: "POST" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Logged out");

    const setCookie = res.headers.get("set-cookie") ?? "";
    // Cookie should be cleared (max-age=0 or expires in the past)
    expect(setCookie).toMatch(/refreshToken=;|Max-Age=0/i);
  });
});
