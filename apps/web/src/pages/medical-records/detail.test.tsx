import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { MedicalRecordDetailPage } from "./detail";
import { useAuthStore } from "@/stores/auth-store";
import type { User, MedicalRecord } from "@caresync/shared";

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
  medicalRecordsApi: {
    get: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    uploadAttachment: vi.fn(),
  },
}));

// Silence sonner toasts in tests
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { useLoaderData, useNavigation, useRevalidator } from "react-router";
import { medicalRecordsApi } from "@/lib/api-client";
import { toast } from "sonner";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockDoctor: User = {
  id: "user-doctor-1",
  email: "dr.smith@caresync.dev",
  role: "doctor",
  firstName: "Jane",
  lastName: "Smith",
  phone: null,
  avatarUrl: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockPatient: User = {
  ...mockDoctor,
  id: "user-patient-1",
  email: "jane.doe@caresync.dev",
  role: "patient",
  firstName: "John",
  lastName: "Doe",
};

const mockAttachment = {
  id: "att-001",
  medicalRecordId: "rec-001",
  fileName: "lab-result.pdf",
  fileUrl: "/uploads/medical-records/some-uuid.pdf",
  fileType: "application/pdf",
  fileSize: 12345,
};

const mockRecord: MedicalRecord = {
  id: "rec-001",
  appointmentId: "appt-001",
  patientId: "patient-001",
  doctorId: "doctor-001",
  diagnosis: "Hypertension",
  symptoms: "Headache, dizziness",
  notes: "Follow up in 2 weeks",
  createdAt: "2026-03-01T10:00:00.000Z",
  appointment: {
    id: "appt-001",
    appointmentDate: "2026-03-01",
    startTime: "09:00:00",
    type: "consultation",
    status: "completed",
  },
  doctor: {
    id: "doctor-001",
    specialization: "Cardiology",
    user: { firstName: "Jane", lastName: "Smith" },
  },
  attachments: [],
};

function renderDetailPage() {
  return render(
    <MemoryRouter initialEntries={["/medical-records/rec-001"]}>
      <Routes>
        <Route
          path="/medical-records/:id"
          element={<MedicalRecordDetailPage />}
        />
      </Routes>
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MedicalRecordDetailPage — AttachmentsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigation).mockReturnValue({ state: "idle" } as any);
    vi.mocked(useRevalidator).mockReturnValue({
      revalidate: vi.fn(),
      state: "idle",
    });
    vi.mocked(useLoaderData).mockReturnValue(mockRecord);
    useAuthStore.setState({
      user: mockDoctor,
      accessToken: "tok",
      isLoading: false,
    });
  });

  it("shows empty state when record has no attachments", () => {
    renderDetailPage();
    expect(screen.getByText(/no attachments yet/i)).toBeInTheDocument();
  });

  it("renders attachment list when record has attachments", () => {
    vi.mocked(useLoaderData).mockReturnValue({
      ...mockRecord,
      attachments: [mockAttachment],
    });
    renderDetailPage();
    expect(screen.getByText("lab-result.pdf")).toBeInTheDocument();
  });

  it("shows upload zone for doctor", () => {
    renderDetailPage();
    expect(screen.getByTestId("upload-zone")).toBeInTheDocument();
  });

  it("hides upload zone for patient", () => {
    useAuthStore.setState({
      user: mockPatient,
      accessToken: "tok",
      isLoading: false,
    });
    renderDetailPage();
    expect(screen.queryByTestId("upload-zone")).not.toBeInTheDocument();
  });

  it("renders download link for each attachment", () => {
    vi.mocked(useLoaderData).mockReturnValue({
      ...mockRecord,
      attachments: [mockAttachment],
    });
    renderDetailPage();
    const link = screen.getByRole("link", { name: /download/i });
    expect(link).toHaveAttribute(
      "href",
      `/api/v1/medical-records/rec-001/attachments/att-001/download`
    );
  });

  it("calls uploadAttachment and revalidates on file drop", async () => {
    const revalidate = vi.fn();
    vi.mocked(useRevalidator).mockReturnValue({ revalidate, state: "idle" });
    vi.mocked(medicalRecordsApi.uploadAttachment).mockResolvedValue(
      mockAttachment
    );

    renderDetailPage();

    const file = new File(["content"], "report.pdf", {
      type: "application/pdf",
    });
    const input = screen.getByTestId("file-input");
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(medicalRecordsApi.uploadAttachment).toHaveBeenCalledWith(
        "rec-001",
        expect.any(FormData)
      );
      expect(revalidate).toHaveBeenCalled();
    });
  });

  it("shows toast error when upload fails", async () => {
    vi.mocked(medicalRecordsApi.uploadAttachment).mockRejectedValue({
      response: {
        data: { message: "Invalid file type. Allowed: pdf, jpg, png" },
      },
    });

    renderDetailPage();

    // Use a valid file type — accept attribute enforcement is handled by userEvent;
    // server-side rejection is what we're testing here.
    const file = new File(["content"], "report.pdf", {
      type: "application/pdf",
    });
    const input = screen.getByTestId("file-input");

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByTestId("upload-error")).toHaveTextContent(
        /invalid file type/i
      );
    });
  });
});
