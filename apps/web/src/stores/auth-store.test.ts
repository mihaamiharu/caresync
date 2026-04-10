import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./auth-store";

const mockUser = {
  id: "user-123",
  email: "patient@caresync.com",
  role: "patient" as const,
  firstName: "John",
  lastName: "Doe",
  phone: null,
  avatarUrl: null,
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isLoading: false });
  });

  it("starts with no user and no token", () => {
    const { user, accessToken } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(accessToken).toBeNull();
  });

  it("setAuth stores user and access token in memory", () => {
    useAuthStore.getState().setAuth(mockUser, "token-abc");
    const { user, accessToken } = useAuthStore.getState();
    expect(user).toEqual(mockUser);
    expect(accessToken).toBe("token-abc");
  });

  it("clearAuth removes user and token", () => {
    useAuthStore.getState().setAuth(mockUser, "token-abc");
    useAuthStore.getState().clearAuth();
    const { user, accessToken } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(accessToken).toBeNull();
  });

  it("isAuthenticated returns true when token is set", () => {
    useAuthStore.getState().setAuth(mockUser, "token-abc");
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
  });

  it("isAuthenticated returns false when no token", () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it("setLoading updates isLoading flag", () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
