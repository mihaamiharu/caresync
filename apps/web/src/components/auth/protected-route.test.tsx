import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { ProtectedRoute } from "./protected-route";
import { useAuthStore } from "@/stores/auth-store";

const mockUser = {
  id: "u1",
  email: "p@test.com",
  role: "patient" as const,
  firstName: "John",
  lastName: "Doe",
  phone: null,
  avatarUrl: null,
  isActive: true,
  createdAt: "",
  updatedAt: "",
};

function renderWithAuth(authenticated: boolean) {
  if (authenticated) {
    useAuthStore.setState({ user: mockUser, accessToken: "token-123", isLoading: false });
  } else {
    useAuthStore.setState({ user: null, accessToken: null, isLoading: false });
  }

  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isLoading: false });
  });

  it("renders children when user is authenticated", () => {
    renderWithAuth(true);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects to /login when user is not authenticated", () => {
    renderWithAuth(false);
    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});
