import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { InvoiceListPage, InvoiceDetailPage } from "./invoices";
import { useAuthStore } from "@/stores/auth-store";
import type { Invoice, InvoiceStatus, User } from "@caresync/shared";

// Mock react-router — use async importOriginal pattern so MemoryRouter stays available
// Mock react-router — preserve all non-hook exports while mocking only hooks
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    // Hooks mocked
    useLoaderData: vi.fn(),
    useNavigation: vi.fn().mockReturnValue({ state: "idle" }),
    useRevalidator: vi
      .fn()
      .mockReturnValue({ revalidate: vi.fn(), state: "idle" }),
    useParams: vi.fn(),
  };
});

vi.mock("@/lib/api-client", () => ({
  invoicesApi: {
    listInvoices: vi.fn(),
    getInvoice: vi.fn(),
    payInvoice: vi.fn(),
  },
}));

import { invoicesApi } from "@/lib/api-client";
import {
  useLoaderData,
  useNavigation,
  useRevalidator,
  useParams,
} from "react-router";

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

const baseInvoice = {
  id: "00000000-0000-0000-0000-000000000001",
  appointmentId: "00000000-0000-0000-0000-000000000101",
  patientId: "00000000-0000-0000-0000-000000000201",
  amount: 100.0,
  tax: 10.0,
  total: 110.0,
  status: "pending" as InvoiceStatus,
  dueDate: "2026-04-20",
  paidAt: null,
};

const mockInvoices: Invoice[] = [
  { ...baseInvoice },
  {
    ...baseInvoice,
    id: "00000000-0000-0000-0000-000000000002",
    status: "paid",
    paidAt: "2026-04-10T10:00:00.000Z",
  },
  {
    ...baseInvoice,
    id: "00000000-0000-0000-0000-000000000003",
    status: "overdue",
    dueDate: "2026-04-01",
  },
];

function renderListPage() {
  return render(
    <MemoryRouter initialEntries={["/invoices"]}>
      <Routes>
        <Route path="/invoices" element={<InvoiceListPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderDetailPage(invoiceId = "00000000-0000-0000-0000-000000000001") {
  vi.mocked(useParams).mockReturnValue({ id: invoiceId });
  return render(
    <MemoryRouter initialEntries={[`/invoices/${invoiceId}`]}>
      <Routes>
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("InvoiceListPage — patient view", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockPatient,
      accessToken: "tok-patient",
      isLoading: false,
    });
    vi.resetAllMocks();
    vi.mocked(useLoaderData).mockReturnValue({ invoices: mockInvoices });
    vi.mocked(useNavigation).mockReturnValue({ state: "idle" } as any);
    vi.mocked(useRevalidator).mockReturnValue({
      revalidate: vi.fn(),
      state: "idle",
    });
  });

  it("renders the page heading", () => {
    renderListPage();
    expect(
      screen.getByRole("heading", { name: /invoices/i, level: 1 })
    ).toBeInTheDocument();
  });

  it("renders invoice cards from loader data", () => {
    renderListPage();
    expect(
      screen.getByTestId("invoice-card-00000000-0000-0000-0000-000000000001")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("invoice-card-00000000-0000-0000-0000-000000000002")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("invoice-card-00000000-0000-0000-0000-000000000003")
    ).toBeInTheDocument();
  });

  it("shows pending, paid, and overdue badges correctly", () => {
    renderListPage();
    expect(
      screen.getByTestId(
        "invoice-status-pending-00000000-0000-0000-0000-000000000001"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(
        "invoice-status-paid-00000000-0000-0000-0000-000000000002"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(
        "invoice-status-overdue-00000000-0000-0000-0000-000000000003"
      )
    ).toBeInTheDocument();
  });

  it("shows Pay Now button on pending invoices for patient", () => {
    renderListPage();
    expect(
      screen.getByTestId("pay-invoice-00000000-0000-0000-0000-000000000001")
    ).toBeInTheDocument();
  });

  it("does NOT show Pay Now button on paid invoices", () => {
    renderListPage();
    expect(
      screen.queryByTestId("pay-invoice-00000000-0000-0000-0000-000000000002")
    ).not.toBeInTheDocument();
  });

  it("filters invoices by status when filter is changed", async () => {
    renderListPage();
    const select = screen.getByTestId("invoice-status-filter");
    await userEvent.selectOptions(select, "pending");
    await waitFor(() => {
      expect(
        screen.getByTestId("invoice-card-00000000-0000-0000-0000-000000000001")
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(
          "invoice-card-00000000-0000-0000-0000-000000000002"
        )
      ).not.toBeInTheDocument();
    });
  });

  it("shows loading indicator when navigating", () => {
    vi.mocked(useNavigation).mockReturnValue({ state: "loading" } as any);
    renderListPage();
    expect(screen.getByTestId("invoices-loading")).toBeInTheDocument();
  });
});

describe("InvoiceListPage — admin view", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockAdmin,
      accessToken: "tok-admin",
      isLoading: false,
    });
    vi.resetAllMocks();
    vi.mocked(useLoaderData).mockReturnValue({ invoices: mockInvoices });
    vi.mocked(useNavigation).mockReturnValue({ state: "idle" } as any);
    vi.mocked(useRevalidator).mockReturnValue({
      revalidate: vi.fn(),
      state: "idle",
    });
  });

  it("shows all invoices to admin regardless of status", () => {
    renderListPage();
    expect(
      screen.getByTestId("invoice-card-00000000-0000-0000-0000-000000000001")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("invoice-card-00000000-0000-0000-0000-000000000002")
    ).toBeInTheDocument();
  });
});

describe("InvoiceDetailPage — with 3-minute countdown and payment simulation", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockPatient,
      accessToken: "tok-patient",
      isLoading: false,
    });
    vi.resetAllMocks();
    vi.mocked(useNavigation).mockReturnValue({ state: "idle" } as any);
    vi.mocked(useRevalidator).mockReturnValue({
      revalidate: vi.fn(),
      state: "idle",
    });
    vi.mocked(useParams).mockReturnValue({
      id: "00000000-0000-0000-0000-000000000001",
    });
    vi.mocked(useLoaderData).mockReturnValue({
      invoice: { ...baseInvoice },
      expiresAt: Date.now() + 180_000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders invoice detail heading", () => {
    renderDetailPage();
    expect(
      screen.getByRole("heading", { name: /invoice detail/i, level: 1 })
    ).toBeInTheDocument();
  });

  it("shows invoice amount and status", () => {
    renderDetailPage();
    expect(screen.getByTestId("invoice-amount")).toHaveTextContent("$110.00");
    expect(screen.getByTestId("invoice-detail-status")).toBeInTheDocument();
  });

  it("shows 3-minute countdown timer on pending invoice", () => {
    renderDetailPage();
    expect(screen.getByTestId("payment-countdown")).toBeInTheDocument();
  });

  it("shows payment success panel after successful payment", async () => {
    vi.mocked(invoicesApi.payInvoice).mockResolvedValue({
      ...baseInvoice,
      status: "paid",
      paidAt: new Date().toISOString(),
    });
    renderDetailPage();
    await userEvent.click(screen.getByTestId("payment-simulate-success"));
    await waitFor(() => {
      expect(screen.getByTestId("payment-success-panel")).toBeInTheDocument();
    });
  });

  it("shows payment failure panel after failed payment", async () => {
    vi.mocked(invoicesApi.payInvoice).mockRejectedValue(
      new Error("Payment failed")
    );
    renderDetailPage();
    await userEvent.click(screen.getByTestId("payment-simulate-fail"));
    await waitFor(() => {
      expect(screen.getByTestId("payment-failure-panel")).toBeInTheDocument();
    });
  });

  it("calls payInvoice API when success toggle is clicked", async () => {
    vi.mocked(invoicesApi.payInvoice).mockResolvedValue({
      ...baseInvoice,
      status: "paid",
      paidAt: new Date().toISOString(),
    });
    renderDetailPage();
    await userEvent.click(screen.getByTestId("payment-simulate-success"));
    await waitFor(() => {
      expect(invoicesApi.payInvoice).toHaveBeenCalledWith(
        "00000000-0000-0000-0000-000000000001"
      );
    });
  });

  it("hides payment buttons after payment is successful", async () => {
    vi.mocked(invoicesApi.payInvoice).mockResolvedValue({
      ...baseInvoice,
      status: "paid",
      paidAt: new Date().toISOString(),
    });
    renderDetailPage();
    await userEvent.click(screen.getByTestId("payment-simulate-success"));
    await waitFor(() => {
      expect(
        screen.queryByTestId("payment-simulate-success")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("payment-simulate-fail")
      ).not.toBeInTheDocument();
    });
  });

  it("shows overdue badge on overdue invoices", () => {
    vi.mocked(useParams).mockReturnValue({
      id: "00000000-0000-0000-0000-000000000003",
    });
    vi.mocked(useLoaderData).mockReturnValue({
      invoice: {
        ...baseInvoice,
        id: "00000000-0000-0000-0000-000000000003",
        status: "overdue" as InvoiceStatus,
        dueDate: "2026-04-01",
      },
    });
    renderDetailPage("00000000-0000-0000-0000-000000000003");
    expect(
      screen.getByTestId("invoice-detail-status-overdue")
    ).toBeInTheDocument();
  });
});
