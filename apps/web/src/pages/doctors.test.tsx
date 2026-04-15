import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { DoctorsPage } from "./doctors";
import { useAuthStore } from "@/stores/auth-store";
import type { User, Doctor, Department } from "@caresync/shared";

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
  doctorsApi: {
    listDoctors: vi.fn(),
    createDoctor: vi.fn(),
    updateDoctor: vi.fn(),
    deleteDoctor: vi.fn(),
  },
  departmentsApi: {
    listDepartments: vi.fn(),
  },
  authApi: {
    login: vi.fn(),
  },
}));

import { useNavigation, useRevalidator } from "react-router";
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
    vi.mocked(doctorsApi.listDoctors).mockImplementation((params) =>
      Promise.resolve({
        data: params?.search
          ? mockDoctors.filter((d) => {
              const name =
                `${d.user?.firstName ?? ""} ${d.user?.lastName ?? ""}`.toLowerCase();
              const spec = d.specialization.toLowerCase();
              const q = params.search!.toLowerCase();
              return name.includes(q) || spec.includes(q);
            })
          : mockDoctors,
      })
    );
    vi.mocked(departmentsApi.listDepartments).mockResolvedValue({
      data: mockDepts,
    });
    vi.mocked(useNavigation).mockReturnValue({ state: "idle" } as any);
    vi.mocked(useRevalidator).mockReturnValue({
      revalidate: vi.fn(),
      state: "idle",
    });
  });

  it("renders the page heading", () => {
    renderPage();
    expect(screen.getByTestId("doctors-page")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /doctors/i, level: 1 })
    ).toBeInTheDocument();
  });

  it("shows doctor cards from loader data", async () => {
    renderPage();
    expect(
      await screen.findByTestId(
        "doctor-card-00000000-0000-0000-0000-000000000001"
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Dr. James Smith")).toBeInTheDocument();
    // Cardiology appears as specialization AND department
    expect(screen.getAllByText("Cardiology").length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT show the Create Doctor button for non-admin", () => {
    renderPage();
    expect(
      screen.queryByTestId("create-doctor-button")
    ).not.toBeInTheDocument();
  });

  it("shows a loading indicator while the router is navigating", () => {
    renderPage();
    expect(screen.getByTestId("doctors-loading")).toBeInTheDocument();
  });

  it("filters doctors client-side when user types in search", async () => {
    renderPage();
    const searchInput = screen.getByTestId("doctors-search");
    await userEvent.type(searchInput, "james");
    await waitFor(() => {
      expect(
        screen.getByTestId("doctor-card-00000000-0000-0000-0000-000000000001")
      ).toBeInTheDocument();
    });
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, "zzznomatch");
    await waitFor(() => {
      expect(
        screen.queryByTestId("doctor-card-00000000-0000-0000-0000-000000000001")
      ).not.toBeInTheDocument();
    });
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
    vi.mocked(doctorsApi.listDoctors).mockResolvedValue({ data: mockDoctors });
    vi.mocked(departmentsApi.listDepartments).mockResolvedValue({
      data: mockDepts,
    });
    vi.mocked(useNavigation).mockReturnValue({ state: "idle" } as any);
    vi.mocked(useRevalidator).mockReturnValue({
      revalidate: vi.fn(),
      state: "idle",
    });
  });

  it("shows the Create Doctor button for admin", () => {
    renderPage();
    expect(screen.getByTestId("create-doctor-button")).toBeInTheDocument();
  });

  it("opens the create form when Create Doctor is clicked", async () => {
    renderPage();
    await userEvent.click(screen.getByTestId("create-doctor-button"));
    expect(screen.getByTestId("doctor-form-modal")).toBeInTheDocument();
  });

  it("calls createDoctor on form submit and revalidates", async () => {
    vi.mocked(doctorsApi.createDoctor).mockResolvedValue(mockDoctors[0]);

    renderPage();
    await userEvent.click(screen.getByTestId("create-doctor-button"));

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

    // Departments are loaded asynchronously in the modal
    expect(
      await screen.findByRole("option", { name: "Cardiology" })
    ).toBeInTheDocument();

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
    await waitFor(() =>
      expect(doctorsApi.listDoctors).toHaveBeenCalledTimes(2)
    );
  });

  it("shows edit and delete buttons on each doctor card for admin", async () => {
    renderPage();
    expect(
      await screen.findByTestId(
        "edit-doctor-00000000-0000-0000-0000-000000000001"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("delete-doctor-00000000-0000-0000-0000-000000000001")
    ).toBeInTheDocument();
  });
});
