import { describe, it, expect } from "vitest";
import { app } from "../app";

describe("Health endpoints", () => {
  it("GET /health returns 200 with ok status", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
  });

  it("GET /api/v1/health returns 200 with ok status", async () => {
    const res = await app.request("/api/v1/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
  });

  it("GET /api/docs returns 200", async () => {
    const res = await app.request("/api/docs");
    expect(res.status).toBe(200);
  });

  it("GET /api/openapi.json returns valid OpenAPI spec", async () => {
    const res = await app.request("/api/openapi.json");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.openapi).toBe("3.1.0");
    expect(body.info.title).toBeDefined();
  });
});
