import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { ProfilePage } from "./profile";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@caresync/shared";

vi.mock("@/lib/api-client", () => ({
  usersApi: {
    updateProfile: vi.fn(),
    updateAvatar: vi.fn(),
  },
  authApi: {
    login: vi.fn(),
  },
}));

import { usersApi } from "@/lib/api-client";

const mockUser: User = {
  id: "user-uuid-123",
  email: "patient@caresync.com",
  role: "patient",
  firstName: "John",
  lastName: "Doe",
  phone: "+1111111111",
  avatarUrl: null,
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: mockUser, accessToken: "tok-123", isLoading: false });
    vi.resetAllMocks();
  });

  it("renders the page with a heading", () => {
    renderProfile();
    expect(screen.getByTestId("profile-page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^profile$/i, level: 1 })).toBeInTheDocument();
  });

  it("pre-fills the form with the current user's data", () => {
    renderProfile();
    expect(screen.getByTestId("first-name-input")).toHaveValue("John");
    expect(screen.getByTestId("last-name-input")).toHaveValue("Doe");
    expect(screen.getByTestId("phone-input")).toHaveValue("+1111111111");
  });

  it("shows the user's email as read-only", () => {
    renderProfile();
    expect(screen.getByText("patient@caresync.com")).toBeInTheDocument();
  });

  it("calls usersApi.updateProfile on form submit", async () => {
    vi.mocked(usersApi.updateProfile).mockResolvedValue({
      ...mockUser,
      firstName: "Jane",
    });
    renderProfile();

    const firstNameInput = screen.getByTestId("first-name-input");
    await userEvent.clear(firstNameInput);
    await userEvent.type(firstNameInput, "Jane");

    await userEvent.click(screen.getByTestId("save-profile-button"));

    await waitFor(() => {
      expect(usersApi.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: "Jane", lastName: "Doe" })
      );
    });
  });

  it("updates the auth store after a successful profile save", async () => {
    vi.mocked(usersApi.updateProfile).mockResolvedValue({
      ...mockUser,
      firstName: "Jane",
    });
    renderProfile();

    await userEvent.clear(screen.getByTestId("first-name-input"));
    await userEvent.type(screen.getByTestId("first-name-input"), "Jane");
    await userEvent.click(screen.getByTestId("save-profile-button"));

    await waitFor(() => {
      expect(useAuthStore.getState().user?.firstName).toBe("Jane");
    });
  });

  it("shows a success message after saving", async () => {
    vi.mocked(usersApi.updateProfile).mockResolvedValue({ ...mockUser, firstName: "Jane" });
    renderProfile();

    await userEvent.click(screen.getByTestId("save-profile-button"));

    expect(await screen.findByTestId("profile-success")).toBeInTheDocument();
  });

  it("shows an error message when the API call fails", async () => {
    vi.mocked(usersApi.updateProfile).mockRejectedValue(
      Object.assign(new Error("Server error"), {
        response: { data: { message: "Failed to update profile" } },
      })
    );
    renderProfile();

    await userEvent.click(screen.getByTestId("save-profile-button"));

    expect(await screen.findByTestId("profile-error")).toBeInTheDocument();
  });

  it("disables the save button while submitting", async () => {
    vi.mocked(usersApi.updateProfile).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500))
    );
    renderProfile();

    await userEvent.click(screen.getByTestId("save-profile-button"));

    expect(screen.getByTestId("save-profile-button")).toBeDisabled();
  });

  it("renders the avatar upload section", () => {
    renderProfile();
    expect(screen.getByTestId("avatar-upload-input")).toBeInTheDocument();
  });
});
