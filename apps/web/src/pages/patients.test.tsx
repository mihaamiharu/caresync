import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { PatientsPage } from "./patients";
import { useAuthStore } from "@/stores/auth-store";
import type { User, Patient } from "@caresync/shared";

vi.mock("@/lib/api-client", () => ({
  patientsApi: {
    listPatients: vi.fn(),
  },
  authApi: {
    login: vi.fn(),
  },
}));

import { patientsApi } from "@/lib/api-client";

const mockAdmin: User = {
  id: "admin-uuid-1",
  email: "admin@caresync.com",
  role: "admin",
  firstName: "Admin",
  lastName: "User",
  phone: null,
  avatarUrl: null,
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const baseUser: User = {
  id: "user-uuid-1",
  email: "john@example.com",
  role: "patient",
  firstName: "John",
  lastName: "Doe",
  phone: null,
  avatarUrl: null,
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockPatients: Patient[] = [
  {
    id: "patient-uuid-1",
    userId: "user-uuid-1",
    dateOfBirth: "1990-05-15",
    gender: "male",
    bloodType: "A+",
    allergies: "penicillin",
    emergencyContactName: "Jane Doe",
    emergencyContactPhone: "+1234567890",
    user: baseUser,
  },
  {
    id: "patient-uuid-2",
    userId: "user-uuid-2",
    dateOfBirth: "1985-03-20",
    gender: "female",
    bloodType: "B-",
    allergies: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    user: {
      ...baseUser,
      id: "user-uuid-2",
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Smith",
    },
  },
];

const mockPaginatedResponse = {
  data: mockPatients,
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/patients"]}>
      <Routes>
        <Route path="/patients" element={<PatientsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("PatientsPage", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockAdmin,
      accessToken: "tok-admin",
      isLoading: false,
    });
    vi.resetAllMocks();
  });

  it("renders the page heading", async () => {
    vi.mocked(patientsApi.listPatients).mockResolvedValue(
      mockPaginatedResponse
    );
    renderPage();
    expect(await screen.findByTestId("patients-page")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /patients/i })
    ).toBeInTheDocument();
  });

  it("renders a table with patient rows", async () => {
    vi.mocked(patientsApi.listPatients).mockResolvedValue(
      mockPaginatedResponse
    );
    renderPage();

    expect(
      await screen.findByTestId("patient-row-patient-uuid-1")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("patient-row-patient-uuid-2")
    ).toBeInTheDocument();
  });

  it("displays patient name, email, DOB, gender and blood type", async () => {
    vi.mocked(patientsApi.listPatients).mockResolvedValue(
      mockPaginatedResponse
    );
    renderPage();

    const row = await screen.findByTestId("patient-row-patient-uuid-1");
    expect(within(row).getByText("John Doe")).toBeInTheDocument();
    expect(within(row).getByText("john@example.com")).toBeInTheDocument();
    expect(within(row).getByText("1990-05-15")).toBeInTheDocument();
    expect(within(row).getByText("male")).toBeInTheDocument();
    expect(within(row).getByText("A+")).toBeInTheDocument();
  });

  it("renders the search input", async () => {
    vi.mocked(patientsApi.listPatients).mockResolvedValue(
      mockPaginatedResponse
    );
    renderPage();

    await screen.findByTestId("patients-page");
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
  });

  it("renders gender and blood type filter dropdowns", async () => {
    vi.mocked(patientsApi.listPatients).mockResolvedValue(
      mockPaginatedResponse
    );
    renderPage();

    await screen.findByTestId("patients-page");
    expect(screen.getByTestId("gender-filter")).toBeInTheDocument();
    expect(screen.getByTestId("blood-type-filter")).toBeInTheDocument();
  });

  it("calls listPatients with search param when user types", async () => {
    vi.mocked(patientsApi.listPatients).mockResolvedValue(
      mockPaginatedResponse
    );
    renderPage();

    await screen.findByTestId("search-input");
    await userEvent.type(screen.getByTestId("search-input"), "john");

    await waitFor(() => {
      expect(patientsApi.listPatients).toHaveBeenCalledWith(
        expect.objectContaining({ search: "john" })
      );
    });
  });

  it("calls listPatients with gender param when filter changes", async () => {
    vi.mocked(patientsApi.listPatients).mockResolvedValue(
      mockPaginatedResponse
    );
    renderPage();

    await screen.findByTestId("gender-filter");
    await userEvent.selectOptions(screen.getByTestId("gender-filter"), "male");

    await waitFor(() => {
      expect(patientsApi.listPatients).toHaveBeenCalledWith(
        expect.objectContaining({ gender: "male" })
      );
    });
  });

  it("calls listPatients with bloodType param when filter changes", async () => {
    vi.mocked(patientsApi.listPatients).mockResolvedValue(
      mockPaginatedResponse
    );
    renderPage();

    await screen.findByTestId("blood-type-filter");
    await userEvent.selectOptions(
      screen.getByTestId("blood-type-filter"),
      "A+"
    );

    await waitFor(() => {
      expect(patientsApi.listPatients).toHaveBeenCalledWith(
        expect.objectContaining({ bloodType: "A+" })
      );
    });
  });

  it("shows an empty state when no patients are returned", async () => {
    vi.mocked(patientsApi.listPatients).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    renderPage();

    expect(await screen.findByTestId("patients-empty")).toBeInTheDocument();
  });

  it("shows pagination info", async () => {
    vi.mocked(patientsApi.listPatients).mockResolvedValue(
      mockPaginatedResponse
    );
    renderPage();

    await screen.findByTestId("patient-row-patient-uuid-1");
    expect(screen.getByTestId("pagination-info")).toBeInTheDocument();
  });
});
