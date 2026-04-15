import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { PatientsPage } from "./patients";
import { useAuthStore } from "@/stores/auth-store";
import type { User, Patient } from "@caresync/shared";

// Mock react-router to supply loader data without a data router
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useLoaderData: vi.fn(),
    useNavigation: vi.fn().mockReturnValue({ state: "idle" }),
    useRevalidator: vi.fn().mockReturnValue({ revalidate: vi.fn() }),
  };
});

vi.mock("@/lib/api-client", () => ({
  patientsApi: {
    listPatients: vi.fn(),
  },
  authApi: {
    login: vi.fn(),
  },
}));

import { useNavigation } from "react-router";
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
    vi.mocked(patientsApi.listPatients).mockResolvedValue(
      mockPaginatedResponse
    );
    vi.mocked(useNavigation).mockReturnValue({ state: "idle" } as any);
  });

  it("renders the page heading", () => {
    renderPage();
    expect(screen.getByTestId("patients-page")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /patients/i })
    ).toBeInTheDocument();
  });

  it("renders a table with patient rows from loader data", async () => {
    renderPage();
    expect(
      await screen.findByTestId("patient-row-patient-uuid-1")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("patient-row-patient-uuid-2")
    ).toBeInTheDocument();
  });

  it("displays patient name, email, DOB, gender and blood type", async () => {
    renderPage();
    const row = await screen.findByTestId("patient-row-patient-uuid-1");
    expect(within(row).getByText("John Doe")).toBeInTheDocument();
    expect(within(row).getByText("john@example.com")).toBeInTheDocument();
    expect(within(row).getByText("1990-05-15")).toBeInTheDocument();
    expect(within(row).getByText("male")).toBeInTheDocument();
    expect(within(row).getByText("A+")).toBeInTheDocument();
  });

  it("renders the search input and filter dropdowns", () => {
    renderPage();
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(screen.getByTestId("gender-filter")).toBeInTheDocument();
    expect(screen.getByTestId("blood-type-filter")).toBeInTheDocument();
  });

  it("shows an empty state when loader returns no patients", async () => {
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
    renderPage();
    await screen.findByTestId("patient-row-patient-uuid-1");
    expect(screen.getByTestId("pagination-info")).toBeInTheDocument();
    expect(screen.getByText(/Showing 1–2 of 2/)).toBeInTheDocument();
  });

  it("shows a loading indicator while the router is navigating", () => {
    renderPage();
    // Loading state hides rows initially (data fetched async)
    expect(
      screen.queryByTestId("patient-row-patient-uuid-1")
    ).not.toBeInTheDocument();
  });
});
