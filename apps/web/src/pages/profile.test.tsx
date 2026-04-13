import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { ProfilePage } from "./profile";
import { useAuthStore } from "@/stores/auth-store";
import type { User, Patient } from "@caresync/shared";

vi.mock("@/lib/api-client", () => ({
  usersApi: {
    updateProfile: vi.fn(),
    updateAvatar: vi.fn(),
  },
  patientsApi: {
    getPatient: vi.fn(),
    upsertPatient: vi.fn(),
  },
  authApi: {
    login: vi.fn(),
  },
}));

import { usersApi, patientsApi } from "@/lib/api-client";

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
    useAuthStore.setState({
      user: mockUser,
      accessToken: "tok-123",
      isLoading: false,
    });
    vi.resetAllMocks();
    vi.mocked(patientsApi.getPatient).mockResolvedValue(null);
  });

  it("renders the page with a heading", () => {
    renderProfile();
    expect(screen.getByTestId("profile-page")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^profile$/i, level: 1 })
    ).toBeInTheDocument();
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
    vi.mocked(usersApi.updateProfile).mockResolvedValue({
      ...mockUser,
      firstName: "Jane",
    });
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

  it("does not render the Medical Information section for non-patient roles", () => {
    useAuthStore.setState({
      user: { ...mockUser, role: "admin" },
      accessToken: "tok-123",
      isLoading: false,
    });
    renderProfile();
    expect(
      screen.queryByTestId("medical-info-section")
    ).not.toBeInTheDocument();
  });
});

const mockPatient: Patient = {
  id: "patient-uuid-123",
  userId: "user-uuid-123",
  dateOfBirth: "1990-05-15",
  gender: "male",
  bloodType: "A+",
  allergies: "penicillin",
  emergencyContactName: "Jane Doe",
  emergencyContactPhone: "+1234567890",
};

describe("ProfilePage — Medical Information section (patient role)", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockUser,
      accessToken: "tok-123",
      isLoading: false,
    });
    vi.resetAllMocks();
    // Seed baseline mocks so the full ProfilePage tree is safe after resetAllMocks.
    // Without these, an accidental profile-form submission would call
    // updateProfile() → undefined → setAuth(undefined, token) → user cleared →
    // MedicalInfoForm unmounts before setSuccess(true) fires.
    vi.mocked(patientsApi.getPatient).mockResolvedValue(null);
    vi.mocked(usersApi.updateProfile).mockResolvedValue(mockUser);
  });

  it("renders the Medical Information section for patients", async () => {
    vi.mocked(patientsApi.getPatient).mockResolvedValue(null);
    renderProfile();
    expect(
      await screen.findByTestId("medical-info-section")
    ).toBeInTheDocument();
  });

  it("pre-fills medical fields from existing patient data", async () => {
    vi.mocked(patientsApi.getPatient).mockResolvedValue(mockPatient);
    renderProfile();

    expect(await screen.findByTestId("dob-input")).toHaveValue("1990-05-15");
    expect(screen.getByTestId("gender-select")).toHaveValue("male");
    expect(screen.getByTestId("blood-type-select")).toHaveValue("A+");
    expect(screen.getByTestId("allergies-input")).toHaveValue("penicillin");
    expect(screen.getByTestId("emergency-contact-name-input")).toHaveValue(
      "Jane Doe"
    );
    expect(screen.getByTestId("emergency-contact-phone-input")).toHaveValue(
      "+1234567890"
    );
  });

  it("shows empty fields when no patient row exists", async () => {
    vi.mocked(patientsApi.getPatient).mockResolvedValue(null);
    renderProfile();

    expect(await screen.findByTestId("dob-input")).toHaveValue("");
    expect(screen.getByTestId("gender-select")).toHaveValue("");
    expect(screen.getByTestId("blood-type-select")).toHaveValue("");
  });

  it("calls patientsApi.upsertPatient on submit", async () => {
    vi.mocked(patientsApi.getPatient).mockResolvedValue(mockPatient);
    vi.mocked(patientsApi.upsertPatient).mockResolvedValue(mockPatient);
    renderProfile();

    await screen.findByTestId("medical-info-section");
    await userEvent.click(screen.getByTestId("save-medical-button"));

    await waitFor(() => {
      expect(patientsApi.upsertPatient).toHaveBeenCalled();
    });
  });

  it("shows success message after saving medical info", async () => {
    vi.mocked(patientsApi.getPatient).mockResolvedValue(mockPatient);
    vi.mocked(patientsApi.upsertPatient).mockResolvedValue(mockPatient);
    renderProfile();

    await screen.findByTestId("medical-info-section");
    await userEvent.click(screen.getByTestId("save-medical-button"));

    expect(await screen.findByTestId("medical-success")).toBeInTheDocument();
  });

  it("shows error message when medical save fails", async () => {
    vi.mocked(patientsApi.getPatient).mockResolvedValue(null);
    vi.mocked(patientsApi.upsertPatient).mockRejectedValue(
      Object.assign(new Error("fail"), {
        response: { data: { message: "Validation error" } },
      })
    );
    renderProfile();

    await screen.findByTestId("medical-info-section");
    await userEvent.click(screen.getByTestId("save-medical-button"));

    expect(await screen.findByTestId("medical-error")).toBeInTheDocument();
  });
});
