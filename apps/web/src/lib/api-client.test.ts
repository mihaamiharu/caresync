import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { apiClient, authApi } from "./api-client";
import { useAuthStore } from "@/stores/auth-store";

// Default handler: refresh always returns 401 (silences the interceptor's refresh attempt in the "throws on 401" test)
const server = setupServer(
  http.post("/api/v1/auth/refresh", () => HttpResponse.json({}, { status: 401 }))
);

beforeEach(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.setState({ user: null, accessToken: null, isLoading: false });
});
afterEach(() => server.close());

describe("authApi.login", () => {
  it("POSTs credentials and returns accessToken and user", async () => {
    server.use(
      http.post("/api/v1/auth/login", () =>
        HttpResponse.json({
          accessToken: "at-123",
          user: { id: "u1", email: "p@test.com", role: "patient" },
        })
      )
    );

    const result = await authApi.login({
      email: "p@test.com",
      password: "secret123",
    });

    expect(result.accessToken).toBe("at-123");
    expect(result.user.email).toBe("p@test.com");
  });

  it("throws on 401 invalid credentials", async () => {
    server.use(
      http.post("/api/v1/auth/login", () =>
        HttpResponse.json({ message: "Invalid credentials" }, { status: 401 })
      )
    );

    await expect(
      authApi.login({ email: "bad@test.com", password: "wrong" })
    ).rejects.toThrow();
  });
});

describe("authApi.register", () => {
  it("POSTs registration data and returns accessToken and user", async () => {
    server.use(
      http.post("/api/v1/auth/register", () =>
        HttpResponse.json({
          accessToken: "at-456",
          user: { id: "u2", email: "new@test.com", role: "patient" },
        }, { status: 201 })
      )
    );

    const result = await authApi.register({
      email: "new@test.com",
      password: "secret123",
      firstName: "Jane",
      lastName: "Doe",
      role: "patient",
    });

    expect(result.accessToken).toBe("at-456");
    expect(result.user.email).toBe("new@test.com");
  });
});

describe("authApi.logout", () => {
  it("POSTs to logout endpoint", async () => {
    let logoutCalled = false;
    server.use(
      http.post("/api/v1/auth/logout", () => {
        logoutCalled = true;
        return HttpResponse.json({}, { status: 200 });
      })
    );

    await authApi.logout();
    expect(logoutCalled).toBe(true);
  });
});

describe("apiClient auth interceptor", () => {
  it("attaches Authorization header when access token is set", async () => {
    useAuthStore.setState({ accessToken: "at-789" } as any);
    let capturedAuth: string | null = null;

    server.use(
      http.get("/api/v1/users/me", ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json({ id: "u1" });
      })
    );

    await apiClient.get("/api/v1/users/me");
    expect(capturedAuth).toBe("Bearer at-789");
  });
});
