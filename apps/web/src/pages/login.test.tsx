import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { LoginPage } from "./login";
import { useAuthStore } from "@/stores/auth-store";

// Mock the auth API
vi.mock("@/lib/api-client", () => ({
  authApi: {
    login: vi.fn(),
  },
}));

import { authApi } from "@/lib/api-client";

function renderLogin(initialPath = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isLoading: false });
    vi.clearAllMocks();
  });

  it("renders email and password fields with a submit button", () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows validation error when submitting empty form", async () => {
    renderLogin();
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
  });

  it("shows validation error for invalid email", async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), "not-an-email");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
  });

  it("shows validation error when password is too short", async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), "p@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "abc");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText(/at least 6 characters/i)).toBeInTheDocument();
  });

  it("calls authApi.login with credentials on valid submit", async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: "at-123",
      user: { id: "u1", email: "p@test.com", role: "patient", firstName: "John", lastName: "Doe", phone: null, avatarUrl: null, isActive: true, createdAt: "", updatedAt: "" },
    });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), "p@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: "p@test.com",
        password: "secret123",
      });
    });
  });

  it("redirects to /dashboard after successful login", async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: "at-123",
      user: { id: "u1", email: "p@test.com", role: "patient", firstName: "John", lastName: "Doe", phone: null, avatarUrl: null, isActive: true, createdAt: "", updatedAt: "" },
    });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), "p@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("displays API error message on failed login", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      Object.assign(new Error("Request failed"), {
        response: { data: { message: "Invalid credentials" } },
      })
    );

    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), "p@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it("shows loading state while submitting", async () => {
    vi.mocked(authApi.login).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500))
    );

    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), "p@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
  });

  it("has a link to the register page", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /sign up|register|create account/i })).toBeInTheDocument();
  });
});
