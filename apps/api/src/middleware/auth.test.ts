import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { requireAuth, requireRole } from "./auth";
import { signAccessToken } from "../lib/jwt";

// Inline the env shape to avoid importing app.ts and its side-effects
type TestEnv = {
  Variables: { userId: string; userRole: string };
};

function makeTestApp() {
  const app = new Hono<TestEnv>();
  app.use("/protected/*", requireAuth);
  app.use("/protected/admin/*", requireRole("admin"));
  app.get("/protected/any", (c) => c.json({ ok: true }));
  app.get("/protected/admin/dashboard", (c) => c.json({ ok: true }));
  return app;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe("requireAuth middleware", () => {
  const app = makeTestApp();

  it("returns 401 when Authorization header is missing", async () => {
    const res = await app.request("/protected/any");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Missing or invalid authorization header");
  });

  it("returns 401 when the Authorization value does not start with 'Bearer '", async () => {
    const res = await app.request("/protected/any", {
      headers: { Authorization: "Basic abc123" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 when the token is malformed", async () => {
    const res = await app.request("/protected/any", {
      headers: bearer("not.a.valid.token"),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Invalid or expired token");
  });

  it("returns 401 when the token is expired", async () => {
    // sign with expiresIn: -1 so the token is already expired
    const { default: jwt } = await import("jsonwebtoken");
    const expired = jwt.sign(
      { userId: "user-123", role: "patient" },
      "dev-secret",
      { expiresIn: -1 }
    );
    const res = await app.request("/protected/any", {
      headers: bearer(expired),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Invalid or expired token");
  });

  it("passes through and sets userId + userRole on context for a valid token", async () => {
    const innerApp = new Hono<TestEnv>();
    innerApp.use("/*", requireAuth);
    innerApp.get("/check", (c) =>
      c.json({ userId: c.get("userId"), userRole: c.get("userRole") })
    );

    const token = signAccessToken({ userId: "user-abc", role: "doctor" });
    const res = await innerApp.request("/check", { headers: bearer(token) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe("user-abc");
    expect(body.userRole).toBe("doctor");
  });
});

describe("requireRole middleware", () => {
  const app = makeTestApp();

  it("returns 403 when the authenticated user has the wrong role", async () => {
    const patientToken = signAccessToken({ userId: "user-123", role: "patient" });
    const res = await app.request("/protected/admin/dashboard", {
      headers: bearer(patientToken),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toBe("Insufficient permissions");
  });

  it("allows access when the user has the required role", async () => {
    const adminToken = signAccessToken({ userId: "admin-123", role: "admin" });
    const res = await app.request("/protected/admin/dashboard", {
      headers: bearer(adminToken),
    });
    expect(res.status).toBe(200);
  });

  it("allows access when the user has one of multiple accepted roles", async () => {
    const multiApp = new Hono<TestEnv>();
    multiApp.use("/*", requireAuth, requireRole("admin", "doctor"));
    multiApp.get("/route", (c) => c.json({ ok: true }));

    const doctorToken = signAccessToken({ userId: "doc-1", role: "doctor" });
    const res = await multiApp.request("/route", { headers: bearer(doctorToken) });
    expect(res.status).toBe(200);
  });

  it("returns 403 when none of the user's roles match the required ones", async () => {
    const multiApp = new Hono<TestEnv>();
    multiApp.use("/*", requireAuth, requireRole("admin", "doctor"));
    multiApp.get("/route", (c) => c.json({ ok: true }));

    const patientToken = signAccessToken({ userId: "user-1", role: "patient" });
    const res = await multiApp.request("/route", { headers: bearer(patientToken) });
    expect(res.status).toBe(403);
  });
});
