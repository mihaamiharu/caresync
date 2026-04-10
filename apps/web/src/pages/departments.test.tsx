import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { DepartmentsPage } from "./departments";
import { useAuthStore } from "@/stores/auth-store";
import type { User, Department } from "@caresync/shared";

vi.mock("@/lib/api-client", () => ({
  departmentsApi: {
    listDepartments: vi.fn(),
    createDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    deleteDepartment: vi.fn(),
  },
  authApi: {
    login: vi.fn(),
  },
}));

import { departmentsApi } from "@/lib/api-client";

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
  { id: "dept-1", name: "Cardiology", description: "Heart care", imageUrl: null, isActive: true },
  { id: "dept-2", name: "Neurology", description: "Brain care", imageUrl: null, isActive: true },
];

const paginatedResponse = {
  data: mockDepts,
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/departments"]}>
      <Routes>
        <Route path="/departments" element={<DepartmentsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("DepartmentsPage — read-only view (patient)", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: mockPatient, accessToken: "tok-patient", isLoading: false });
    vi.resetAllMocks();
    vi.mocked(departmentsApi.listDepartments).mockResolvedValue(paginatedResponse);
  });

  it("renders the page heading", async () => {
    renderPage();
    expect(await screen.findByTestId("departments-page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /departments/i, level: 1 })).toBeInTheDocument();
  });

  it("shows department cards after loading", async () => {
    renderPage();
    expect(await screen.findByTestId("department-card-dept-1")).toBeInTheDocument();
    expect(screen.getByTestId("department-card-dept-2")).toBeInTheDocument();
    expect(screen.getByText("Cardiology")).toBeInTheDocument();
    expect(screen.getByText("Neurology")).toBeInTheDocument();
  });

  it("shows a loading indicator while fetching", () => {
    vi.mocked(departmentsApi.listDepartments).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );
    renderPage();
    expect(screen.getByTestId("departments-loading")).toBeInTheDocument();
  });

  it("shows an error message when the API call fails", async () => {
    vi.mocked(departmentsApi.listDepartments).mockRejectedValue(new Error("Network error"));
    renderPage();
    expect(await screen.findByTestId("departments-error")).toBeInTheDocument();
  });

  it("supports search by name", async () => {
    renderPage();
    await screen.findByTestId("departments-search");

    const searchInput = screen.getByTestId("departments-search");
    await userEvent.type(searchInput, "cardio");

    await waitFor(() => {
      expect(departmentsApi.listDepartments).toHaveBeenCalledWith(
        expect.objectContaining({ search: "cardio" })
      );
    });
  });

  it("does NOT show the Create Department button for non-admin", async () => {
    renderPage();
    await screen.findByTestId("departments-page");
    expect(screen.queryByTestId("create-department-button")).not.toBeInTheDocument();
  });
});

describe("DepartmentsPage — admin view", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: mockAdmin, accessToken: "tok-admin", isLoading: false });
    vi.resetAllMocks();
    vi.mocked(departmentsApi.listDepartments).mockResolvedValue(paginatedResponse);
  });

  it("shows the Create Department button for admin", async () => {
    renderPage();
    expect(await screen.findByTestId("create-department-button")).toBeInTheDocument();
  });

  it("opens the create form when Create Department is clicked", async () => {
    renderPage();
    await userEvent.click(await screen.findByTestId("create-department-button"));
    expect(screen.getByTestId("department-form-modal")).toBeInTheDocument();
  });

  it("calls createDepartment on form submit and refreshes the list", async () => {
    const newDept: Department = { id: "dept-3", name: "Orthopaedics", description: null, imageUrl: null, isActive: true };
    vi.mocked(departmentsApi.createDepartment).mockResolvedValue(newDept);

    renderPage();
    await userEvent.click(await screen.findByTestId("create-department-button"));

    await userEvent.type(screen.getByTestId("dept-name-input"), "Orthopaedics");
    await userEvent.click(screen.getByTestId("dept-form-submit"));

    await waitFor(() => {
      expect(departmentsApi.createDepartment).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Orthopaedics" })
      );
    });
    // List should be re-fetched
    await waitFor(() => {
      expect(departmentsApi.listDepartments).toHaveBeenCalledTimes(2);
    });
  });

  it("shows edit and delete buttons on each department card for admin", async () => {
    renderPage();
    await screen.findByTestId("department-card-dept-1");
    expect(screen.getByTestId("edit-department-dept-1")).toBeInTheDocument();
    expect(screen.getByTestId("delete-department-dept-1")).toBeInTheDocument();
  });

  it("calls deleteDepartment and refreshes list on delete", async () => {
    vi.mocked(departmentsApi.deleteDepartment).mockResolvedValue(undefined);
    renderPage();

    await userEvent.click(await screen.findByTestId("delete-department-dept-1"));

    await waitFor(() => {
      expect(departmentsApi.deleteDepartment).toHaveBeenCalledWith("dept-1");
    });
    await waitFor(() => {
      expect(departmentsApi.listDepartments).toHaveBeenCalledTimes(2);
    });
  });

  it("opens edit form pre-filled when Edit is clicked", async () => {
    renderPage();
    await userEvent.click(await screen.findByTestId("edit-department-dept-1"));
    expect(screen.getByTestId("department-form-modal")).toBeInTheDocument();
    expect(screen.getByTestId("dept-name-input")).toHaveValue("Cardiology");
  });

  it("calls updateDepartment on edit form submit", async () => {
    const updated: Department = { ...mockDepts[0], name: "Cardiology Updated" };
    vi.mocked(departmentsApi.updateDepartment).mockResolvedValue(updated);

    renderPage();
    await userEvent.click(await screen.findByTestId("edit-department-dept-1"));

    const nameInput = screen.getByTestId("dept-name-input");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Cardiology Updated");
    await userEvent.click(screen.getByTestId("dept-form-submit"));

    await waitFor(() => {
      expect(departmentsApi.updateDepartment).toHaveBeenCalledWith(
        "dept-1",
        expect.objectContaining({ name: "Cardiology Updated" })
      );
    });
  });
});
