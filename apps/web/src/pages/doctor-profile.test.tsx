import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { DoctorProfilePage } from "./doctor-profile";
import { useAuthStore } from "@/stores/auth-store";
import type { User, Doctor, DoctorSchedule } from "@caresync/shared";

vi.mock("@/lib/api-client", () => ({
  doctorsApi: {
    getDoctor: vi.fn(),
  },
  schedulesApi: {
    getSchedule: vi.fn(),
    putSchedule: vi.fn(),
    getAvailableSlots: vi.fn(),
  },
}));

import { doctorsApi, schedulesApi } from "@/lib/api-client";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DOCTOR_ID = "00000000-0000-0000-0000-000000000001";
const DOCTOR_USER_ID = "00000000-0000-0000-0000-000000000101";

const mockDoctorUser: User = {
  id: DOCTOR_USER_ID,
  email: "doc@example.com",
  role: "doctor",
  firstName: "Jane",
  lastName: "Smith",
  phone: null,
  avatarUrl: null,
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockPatient: User = {
  ...mockDoctorUser,
  id: "patient-user-id",
  role: "patient",
  email: "patient@example.com",
};

const mockDoctor: Doctor = {
  id: DOCTOR_ID,
  userId: DOCTOR_USER_ID,
  departmentId: "dept-001",
  specialization: "Cardiology",
  bio: "Experienced cardiologist",
  licenseNumber: "LIC001",
  user: mockDoctorUser,
  department: {
    id: "dept-001",
    name: "Cardiology",
    description: null,
    imageUrl: null,
    isActive: true,
  },
};

const mockSchedule: DoctorSchedule[] = [
  {
    id: "sched-001",
    doctorId: DOCTOR_ID,
    dayOfWeek: "monday",
    startTime: "09:00",
    endTime: "17:00",
    slotDurationMinutes: 30,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/doctors/${DOCTOR_ID}`]}>
      <Routes>
        <Route path="/doctors/:id" element={<DoctorProfilePage />} />
      </Routes>
    </MemoryRouter>
  );
}

function setDefaultMocks() {
  vi.mocked(doctorsApi.getDoctor).mockResolvedValue(mockDoctor);
  vi.mocked(schedulesApi.getSchedule).mockResolvedValue([]);
  vi.mocked(schedulesApi.putSchedule).mockResolvedValue([]);
  vi.mocked(schedulesApi.getAvailableSlots).mockResolvedValue([]);
}

// ─── Doctor profile page basics ───────────────────────────────────────────────

describe("DoctorProfilePage — basics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setDefaultMocks();
    useAuthStore.setState({
      user: mockPatient,
      accessToken: "tok",
      isLoading: false,
    });
  });

  it("renders the profile page", async () => {
    renderPage();
    expect(
      await screen.findByTestId("doctor-profile-page")
    ).toBeInTheDocument();
    expect(await screen.findByText("Dr. Jane Smith")).toBeInTheDocument();
  });
});

// ─── Schedule form visibility ─────────────────────────────────────────────────

describe("DoctorScheduleForm — visibility", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setDefaultMocks();
  });

  it("hides the schedule form for a non-owning user (patient)", async () => {
    useAuthStore.setState({
      user: mockPatient,
      accessToken: "tok",
      isLoading: false,
    });
    renderPage();
    await screen.findByTestId("doctor-profile-page");
    expect(screen.queryByTestId("schedule-form")).not.toBeInTheDocument();
  });

  it("shows the schedule form for the owning doctor", async () => {
    useAuthStore.setState({
      user: mockDoctorUser,
      accessToken: "tok",
      isLoading: false,
    });
    renderPage();
    expect(await screen.findByTestId("schedule-form")).toBeInTheDocument();
  });
});

// ─── Schedule form — behaviour ────────────────────────────────────────────────

describe("DoctorScheduleForm — behaviour", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setDefaultMocks();
    useAuthStore.setState({
      user: mockDoctorUser,
      accessToken: "tok",
      isLoading: false,
    });
  });

  it("pre-populates the form with the existing schedule", async () => {
    vi.mocked(schedulesApi.getSchedule).mockResolvedValue(mockSchedule);
    renderPage();

    // Monday checkbox should become checked after load
    const mondayCheckbox = await screen.findByTestId("day-toggle-monday");
    await waitFor(() => expect(mondayCheckbox).toBeChecked());

    // slot duration should be 30
    expect(screen.getByTestId("slot-duration-input")).toHaveValue(30);
  });

  it("shows success message after a successful save", async () => {
    vi.mocked(schedulesApi.putSchedule).mockResolvedValue([]);
    renderPage();
    await screen.findByTestId("schedule-form");

    const submitBtn = screen.getByTestId("schedule-submit");
    await userEvent.click(submitBtn);

    expect(await screen.findByTestId("schedule-success")).toBeInTheDocument();
  });

  it("shows error message when save fails", async () => {
    vi.mocked(schedulesApi.putSchedule).mockRejectedValue({
      response: { data: { message: "Conflict with appointments" } },
    });
    renderPage();
    await screen.findByTestId("schedule-form");

    const submitBtn = screen.getByTestId("schedule-submit");
    await userEvent.click(submitBtn);

    expect(await screen.findByTestId("schedule-error")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-error")).toHaveTextContent(
      "Conflict with appointments"
    );
  });
});

// ─── Slot viewer ──────────────────────────────────────────────────────────────

describe("DoctorAvailabilityViewer", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setDefaultMocks();
    useAuthStore.setState({
      user: mockPatient,
      accessToken: "tok",
      isLoading: false,
    });
  });

  it("renders the date picker", async () => {
    renderPage();
    await screen.findByTestId("doctor-profile-page");
    expect(screen.getByTestId("slot-date-picker")).toBeInTheDocument();
  });

  it("shows empty state when no slots are returned", async () => {
    vi.mocked(schedulesApi.getAvailableSlots).mockResolvedValue([]);
    renderPage();
    await screen.findByTestId("doctor-profile-page");

    const datePicker = screen.getByTestId("slot-date-picker");
    fireEvent.change(datePicker, { target: { value: "2026-05-05" } });

    expect(await screen.findByTestId("slot-empty")).toBeInTheDocument();
  });

  it("displays available slots as UTC+7 times", async () => {
    // "2026-05-04T02:00:00.000Z" = 09:00 Bangkok time
    vi.mocked(schedulesApi.getAvailableSlots).mockResolvedValue([
      "2026-05-04T02:00:00.000Z",
      "2026-05-04T02:30:00.000Z",
    ]);
    renderPage();
    await screen.findByTestId("doctor-profile-page");

    const datePicker = screen.getByTestId("slot-date-picker");
    fireEvent.change(datePicker, { target: { value: "2026-05-04" } });

    expect(
      await screen.findByTestId("slot-2026-05-04T02:00:00.000Z")
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId("slot-2026-05-04T02:30:00.000Z")
    ).toBeInTheDocument();
  });
});
