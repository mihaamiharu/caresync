import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { RegisterPage } from "./register";
import { useAuthStore } from "@/stores/auth-store";

vi.mock("@/lib/api-client", () => ({
  authApi: {
    register: vi.fn(),
  },
}));

import { authApi } from "@/lib/api-client";

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isLoading: false });
    vi.clearAllMocks();
  });

  it("renders all required fields", () => {
    renderRegister();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account|sign up|register/i })).toBeInTheDocument();
  });

  it("role is fixed to patient and not user-selectable", () => {
    renderRegister();
    // No role select dropdown — patients can only self-register as patients
    const roleSelect = screen.queryByRole("combobox", { name: /role/i });
    expect(roleSelect).not.toBeInTheDocument();
  });

  it("shows validation errors on empty submission", async () => {
    renderRegister();
    await userEvent.click(screen.getByRole("button", { name: /create account|sign up|register/i }));
    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
  });

  it("shows email validation error for invalid email", async () => {
    renderRegister();
    await userEvent.type(screen.getByLabelText(/first name/i), "Jane");
    await userEvent.type(screen.getByLabelText(/last name/i), "Doe");
    await userEvent.type(screen.getByLabelText(/email/i), "not-valid");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /create account|sign up|register/i }));
    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
  });

  it("calls authApi.register with patient role on valid submit", async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      accessToken: "at-456",
      user: { id: "u2", email: "new@test.com", role: "patient", firstName: "Jane", lastName: "Doe", phone: null, avatarUrl: null, isActive: true, createdAt: "", updatedAt: "" },
    });

    renderRegister();
    await userEvent.type(screen.getByLabelText(/first name/i), "Jane");
    await userEvent.type(screen.getByLabelText(/last name/i), "Doe");
    await userEvent.type(screen.getByLabelText(/email/i), "new@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /create account|sign up|register/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "new@test.com",
          firstName: "Jane",
          lastName: "Doe",
          role: "patient",
        })
      );
    });
  });

  it("redirects to /dashboard after successful registration", async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      accessToken: "at-456",
      user: { id: "u2", email: "new@test.com", role: "patient", firstName: "Jane", lastName: "Doe", phone: null, avatarUrl: null, isActive: true, createdAt: "", updatedAt: "" },
    });

    renderRegister();
    await userEvent.type(screen.getByLabelText(/first name/i), "Jane");
    await userEvent.type(screen.getByLabelText(/last name/i), "Doe");
    await userEvent.type(screen.getByLabelText(/email/i), "new@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /create account|sign up|register/i }));

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("displays API error on failed registration", async () => {
    vi.mocked(authApi.register).mockRejectedValue(
      Object.assign(new Error("Request failed"), {
        response: { data: { message: "Email already registered" } },
      })
    );

    renderRegister();
    await userEvent.type(screen.getByLabelText(/first name/i), "Jane");
    await userEvent.type(screen.getByLabelText(/last name/i), "Doe");
    await userEvent.type(screen.getByLabelText(/email/i), "taken@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /create account|sign up|register/i }));

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
  });

  it("disables submit button while loading", async () => {
    vi.mocked(authApi.register).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500))
    );

    renderRegister();
    await userEvent.type(screen.getByLabelText(/first name/i), "Jane");
    await userEvent.type(screen.getByLabelText(/last name/i), "Doe");
    await userEvent.type(screen.getByLabelText(/email/i), "new@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /create account|sign up|register/i }));

    expect(screen.getByRole("button", { name: /create account|sign up|register/i })).toBeDisabled();
  });

  it("has a link to the login page", () => {
    renderRegister();
    expect(screen.getByRole("link", { name: /sign in|log in|login/i })).toBeInTheDocument();
  });

  it("redirects to /dashboard when already authenticated", () => {
    useAuthStore.setState({
      user: { id: "u1", email: "p@test.com", role: "patient", firstName: "John", lastName: "Doe", phone: null, avatarUrl: null, isActive: true, createdAt: "", updatedAt: "" },
      accessToken: "existing-token",
    });
    renderRegister();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
