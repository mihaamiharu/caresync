import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { AppointmentDetailPage } from "./detail";
import { useAuthStore } from "@/stores/auth-store";
import {
  appointmentsApi,
  reviewsApi,
  medicalRecordsApi,
} from "@/lib/api-client";
import type { Appointment, Review } from "@caresync/shared";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useLoaderData: vi.fn(),
    useParams: vi.fn().mockReturnValue({ id: "appt-123" }),
  };
});

vi.mock("@/lib/api-client", () => ({
  appointmentsApi: {
    get: vi.fn(),
    updateStatus: vi.fn(),
  },
  reviewsApi: {
    getByAppointment: vi.fn(),
    create: vi.fn(),
  },
  medicalRecordsApi: {
    list: vi.fn(),
  },
}));

import { useLoaderData } from "react-router";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockAppointment: Appointment = {
  id: "appt-123",
  patientId: "p-1",
  doctorId: "d-1",
  appointmentDate: "2026-04-20",
  startTime: "10:00",
  endTime: "10:30",
  status: "completed",
  type: "consultation",
  reason: "Checkup",
  notes: null,
  patient: {
    id: "p-1",
    user: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
  } as any,
  doctor: {
    id: "d-1",
    user: { firstName: "John", lastName: "Smith", email: "john@example.com" },
    specialization: "General Practice",
  } as any,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/appointments/appt-123"]}>
      <Routes>
        <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AppointmentDetailPage — Review Section", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore
      .getState()
      .setAuth(
        { id: "u-1", role: "patient", email: "p@e.com" } as any,
        "mock-token"
      );
    (useLoaderData as any).mockReturnValue({
      appointment: mockAppointment,
      medicalRecord: null,
    });
    (medicalRecordsApi.list as any).mockResolvedValue([]);
  });

  it("renders review section for completed appointments owned by patient", async () => {
    (reviewsApi.getByAppointment as any).mockRejectedValue({
      response: { status: 404 },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("review-section")).toBeInTheDocument();
    });
    expect(screen.getByText(/How was your visit\?/i)).toBeInTheDocument();
  });

  it("does not render review section for non-completed appointments", async () => {
    (useLoaderData as any).mockReturnValue({
      appointment: { ...mockAppointment, status: "confirmed" },
      medicalRecord: null,
    });

    renderPage();

    expect(screen.queryByTestId("review-section")).not.toBeInTheDocument();
  });

  it("submits a review successfully", async () => {
    (reviewsApi.getByAppointment as any).mockRejectedValue({
      response: { status: 404 },
    });
    (reviewsApi.create as any).mockResolvedValue({ id: "rev-1" });

    renderPage();

    // Click 4th star
    const star4 = await screen.findByTestId("star-4");
    await user.click(star4);

    // Enter comment
    const commentInput = screen.getByTestId("review-comment-input");
    await user.type(commentInput, "Great doctor!");

    // Submit
    const submitBtn = screen.getByTestId("review-submit");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(reviewsApi.create).toHaveBeenCalledWith({
        appointmentId: "appt-123",
        rating: 4,
        comment: "Great doctor!",
      });
      expect(screen.getByTestId("review-submitted")).toBeInTheDocument();
    });
  });

  it("blocks submission and shows error if comment is too long", async () => {
    (reviewsApi.getByAppointment as any).mockRejectedValue({
      response: { status: 404 },
    });

    renderPage();

    // Click a star to enable submit button initially
    const star5 = await screen.findByTestId("star-5");
    await user.click(star5);

    const commentInput = screen.getByTestId("review-comment-input");
    const longComment = "a".repeat(501);
    await user.type(commentInput, longComment);

    const submitBtn = screen.getByTestId("review-submit");
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText("501/500")).toHaveClass("text-destructive");
  });

  it("displays error message from API if submission fails", async () => {
    (reviewsApi.getByAppointment as any).mockRejectedValue({
      response: { status: 404 },
    });
    (reviewsApi.create as any).mockRejectedValue({
      response: { data: { message: "Duplicate review error" } },
    });

    renderPage();

    await user.click(await screen.findByTestId("star-5"));
    await user.click(screen.getByTestId("review-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("review-error")).toHaveTextContent(
        "Duplicate review error"
      );
    });
  });

  it("shows existing review if already reviewed", async () => {
    const mockReview: Review = {
      id: "rev-1",
      appointmentId: "appt-123",
      patientId: "p-1",
      doctorId: "d-1",
      rating: 5,
      comment: "Already reviewed",
      createdAt: "2026-04-21T10:00:00.000Z",
    };
    (reviewsApi.getByAppointment as any).mockResolvedValue(mockReview);

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("review-submitted")).toBeInTheDocument();
      expect(screen.getByText(/"Already reviewed"/i)).toBeInTheDocument();
    });
  });
});
