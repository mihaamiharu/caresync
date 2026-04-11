import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { DoctorsPage } from "./doctors";
import { useAuthStore } from "@/stores/auth-store";
import type { User, Doctor, Department } from "@caresync/shared";

vi.mock("@/lib/api-client", () => ({
  doctorsApi: {
    listDoctors: vi.fn(),
    createDoctor: vi.fn(),
    updateDoctor: vi.fn(),
    deleteDoctor: vi.fn(),
  },
  departmentsApi: {
    listDepartments: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  },
  authApi: {
    login: vi.fn(),
  },
}));

import { doctorsApi, departmentsApi } from "@/lib/api-client";

const mockPatient: User = {
  id: "user-patient-1",
  email: "patient@caresync.com",
  role: "patient",
  firstName: "John",
  lastName: "Doe",
  phone: null,
  avatarUrl: null,
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockAdmin: User = {
  ...mockPatient,
  id: "user-admin-1",
  email: "admin@caresync.com",
  role: "admin",
};

const mockDepts: Department[] = [
  {
    id: "00000000-0000-0000-0000-000000000201",
    name: "Cardiology",
    description: "Heart care",
    imageUrl: null,
    isActive: true,
  },
];

const mockDoctors: Doctor[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    userId: "00000000-0000-0000-0000-000000000101",
    departmentId: "00000000-0000-0000-0000-000000000201",
    specialization: "Cardiology",
    bio: "Bio 1",
    licenseNumber: "LIC1",
    user: {
      id: "00000000-0000-0000-0000-000000000101",
      email: "doc1@example.com",
      role: "doctor",
      firstName: "James",
      lastName: "Smith",
      phone: null,
      avatarUrl: null,
      isActive: true,
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    },
    department: mockDepts[0],
  },
];

const paginatedResponse = {
  data: mockDoctors,
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/doctors"]}>
      <Routes>
        <Route path="/doctors" element={<DoctorsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("DoctorsPage — read-only view (patient)", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockPatient,
      accessToken: "tok-patient",
      isLoading: false,
    });
    vi.resetAllMocks();
    vi.mocked(doctorsApi.listDoctors).mockResolvedValue(paginatedResponse);
  });

  it("renders the page heading", async () => {
    renderPage();
    expect(await screen.findByTestId("doctors-page")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /doctors/i, level: 1 })
    ).toBeInTheDocument();
  });

  it("shows doctor cards after loading", async () => {
    renderPage();
    expect(
      await screen.findByTestId(
        "doctor-card-00000000-0000-0000-0000-000000000001"
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Dr. James Smith")).toBeInTheDocument();
    // Use getAllByText because Cardiology appears as specialization AND department
    expect(screen.getAllByText("Cardiology").length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT show the Create Doctor button for non-admin", async () => {
    renderPage();
    await screen.findByTestId("doctors-page");
    expect(
      screen.queryByTestId("create-doctor-button")
    ).not.toBeInTheDocument();
  });
});

describe("DoctorsPage — admin view", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockAdmin,
      accessToken: "tok-admin",
      isLoading: false,
    });
    vi.resetAllMocks();
    vi.mocked(doctorsApi.listDoctors).mockResolvedValue(paginatedResponse);
    vi.mocked(departmentsApi.listDepartments).mockResolvedValue({
      data: mockDepts,
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
  });

  it("shows the Create Doctor button for admin", async () => {
    renderPage();
    expect(
      await screen.findByTestId("create-doctor-button")
    ).toBeInTheDocument();
  });

  it("opens the create form when Create Doctor is clicked", async () => {
    renderPage();
    await userEvent.click(await screen.findByTestId("create-doctor-button"));
    expect(screen.getByTestId("doctor-form-modal")).toBeInTheDocument();
  });

  it("calls createDoctor on form submit and refreshes the list", async () => {
    vi.mocked(doctorsApi.createDoctor).mockResolvedValue(mockDoctors[0]);

    renderPage();
    await userEvent.click(await screen.findByTestId("create-doctor-button"));

    await userEvent.type(screen.getByTestId("doctor-firstName-input"), "James");
    await userEvent.type(screen.getByTestId("doctor-lastName-input"), "Smith");
    await userEvent.type(
      screen.getByTestId("doctor-email-input"),
      "james@example.com"
    );
    await userEvent.type(
      screen.getByTestId("doctor-password-input"),
      "password123"
    );

    // Wait for departments to load
    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: "Cardiology" })
      ).toBeInTheDocument();
    });

    await userEvent.selectOptions(
      screen.getByTestId("doctor-department-input"),
      "00000000-0000-0000-0000-000000000201"
    );
    await userEvent.type(
      screen.getByTestId("doctor-specialization-input"),
      "Cardiology"
    );
    await userEvent.type(screen.getByTestId("doctor-license-input"), "LIC123");

    await userEvent.click(screen.getByTestId("doctor-form-submit"));

    await waitFor(() => {
      expect(doctorsApi.createDoctor).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "James",
          lastName: "Smith",
          email: "james@example.com",
        })
      );
    });
    // List should be re-fetched
    await waitFor(() => {
      expect(doctorsApi.listDoctors).toHaveBeenCalledTimes(2);
    });
  });

  it("shows edit and delete buttons on each doctor card for admin", async () => {
    renderPage();
    await screen.findByTestId(
      "doctor-card-00000000-0000-0000-0000-000000000001"
    );
    expect(
      screen.getByTestId("edit-doctor-00000000-0000-0000-0000-000000000001")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("delete-doctor-00000000-0000-0000-0000-000000000001")
    ).toBeInTheDocument();
  });
});
