import { useState, useCallback, useSyncExternalStore } from "react";
import {
  useLoaderData,
  useNavigation,
  useParams,
  useRevalidator,
  LoaderFunctionArgs,
} from "react-router";
import { invoicesApi } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { Invoice, InvoiceStatus } from "@caresync/shared";

// ─── Loader ────────────────────────────────────────────────────────────────────

export async function invoicesLoader() {
  const res = await invoicesApi.listInvoices({ limit: 100 });
  return { invoices: res.data };
}

export async function invoiceDetailLoader({ params }: LoaderFunctionArgs) {
  const invoice = await invoicesApi.getInvoice(params.id!);
  return {
    invoice,
    expiresAt: invoice.status === "pending" ? Date.now() + 180_000 : null,
  };
}

// ─── Tick store (no useEffect) ─────────────────────────────────────────────────

const tick = () => Date.now();
const subscribe = () => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
};
const getSnapshot = () => 0;

function useNow() {
  return useSyncExternalStore(subscribe, tick, getSnapshot);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `$${num.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function StatusBadge({
  status,
  invoiceId,
}: {
  status: InvoiceStatus;
  invoiceId?: string;
}) {
  const classes: Record<InvoiceStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
  };
  return (
    <span
      data-testid={`invoice-status-${status}${invoiceId ? `-${invoiceId}` : ""}`}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function DetailStatusBadge({ status }: { status: InvoiceStatus }) {
  const classes: Record<InvoiceStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
  };
  return (
    <span
      data-testid={`invoice-detail-status${status === "overdue" ? `-${status}` : ""}`}
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${classes[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Invoice Card ──────────────────────────────────────────────────────────────

interface InvoiceCardProps {
  invoice: Invoice;
  showPayButton: boolean;
  onPay?: (id: string) => void;
}

function InvoiceCard({ invoice, showPayButton, onPay }: InvoiceCardProps) {
  const isOverdue =
    invoice.status === "pending" && new Date(invoice.dueDate) < new Date();

  return (
    <div
      data-testid={`invoice-card-${invoice.id}`}
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-mono text-muted-foreground">
            INV-{invoice.id.split("-")[0].toUpperCase()}
          </p>
          <p className="mt-1 text-lg font-semibold text-card-foreground">
            {formatCurrency(invoice.total)}
          </p>
          <p className="text-xs text-muted-foreground">
            Due: {formatDate(invoice.dueDate)}
          </p>
          {isOverdue && invoice.status !== "overdue" && (
            <p className="mt-1 text-xs font-medium text-destructive">Overdue</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={invoice.status} invoiceId={invoice.id} />
          {showPayButton && invoice.status === "pending" && (
            <a
              href={`/invoices/${invoice.id}`}
              data-testid={`pay-invoice-${invoice.id}`}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Pay Now
            </a>
          )}
          {invoice.status === "paid" && invoice.paidAt && (
            <p className="text-xs text-muted-foreground">
              Paid {formatDate(invoice.paidAt)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Invoice List Page ─────────────────────────────────────────────────────────

export function InvoiceListPage() {
  const { invoices } = useLoaderData() as { invoices: Invoice[] };
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);

  const [statusFilter, setStatusFilter] = useState<string>("all");

  const isLoading = navigation.state !== "idle";

  const filtered = invoices.filter((inv) => {
    if (statusFilter === "all") return true;
    return inv.status === statusFilter;
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {isLoading && (
        <div
          data-testid="invoices-loading"
          className="flex justify-center py-8"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h1
              data-testid="invoices-page"
              className="text-2xl font-bold text-card-foreground"
            >
              Invoices
            </h1>
            <select
              data-testid="invoice-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <p className="text-muted-foreground">No invoices found.</p>
          ) : (
            <div className="space-y-4">
              {filtered.map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  showPayButton={
                    user?.role === "patient" || user?.role === "admin"
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Payment Countdown ─────────────────────────────────────────────────────────
// Uses useSyncExternalStore (no useEffect) to tick every second.

function PaymentCountdown({ expiresAt }: { expiresAt: number }) {
  const now = useNow();
  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const display = `${mins}:${secs.toString().padStart(2, "0")}`;

  const isUrgent = secondsLeft <= 30;

  if (secondsLeft === 0) {
    return (
      <div
        data-testid="payment-countdown"
        className="rounded-lg bg-destructive/10 p-4 text-center"
      >
        <p className="text-sm text-destructive">Payment window expired.</p>
      </div>
    );
  }

  return (
    <div
      data-testid="payment-countdown"
      className={`rounded-lg p-4 text-center ${isUrgent ? "bg-destructive/10" : "bg-muted"}`}
    >
      <p className="text-sm text-muted-foreground">Payment window expires in</p>
      <p
        className={`text-3xl font-bold ${isUrgent ? "text-destructive" : "text-foreground"}`}
      >
        {display}
      </p>
    </div>
  );
}

// ─── Invoice Detail Page ───────────────────────────────────────────────────────

export function InvoiceDetailPage() {
  const { invoice, expiresAt } = useLoaderData() as {
    invoice: Invoice;
    expiresAt: number | null;
  };
  const params = useParams<{ id: string }>();
  const revalidator = useRevalidator();
  const user = useAuthStore((s) => s.user);

  const [paymentState, setPaymentState] = useState<
    "idle" | "success" | "failure"
  >("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const isPatient = user?.role === "patient" || user?.role === "admin";
  const canPay = isPatient && invoice.status === "pending";

  const handlePayment = useCallback(
    async (simulateSuccess: boolean) => {
      if (!simulateSuccess) {
        setPaymentState("failure");
        return;
      }
      try {
        await invoicesApi.payInvoice(params.id!);
        setPaymentState("success");
        revalidator.revalidate();
      } catch (err: unknown) {
        const axiosError = err as {
          response?: { data?: { message?: string } };
        };
        setServerError(
          axiosError.response?.data?.message ??
            "Payment failed. Please try again."
        );
        setPaymentState("failure");
      }
    },
    [params.id, revalidator]
  );

  const isOverdue =
    (invoice.status === "pending" || invoice.status === "overdue") &&
    new Date(invoice.dueDate) < new Date();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <a
        href="/invoices"
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Invoices
      </a>

      <h1
        data-testid="invoice-detail-page"
        className="mb-6 text-2xl font-bold text-card-foreground"
      >
        Invoice Detail
      </h1>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-mono text-muted-foreground">
              INV-{invoice.id.split("-")[0].toUpperCase()}
            </p>
            <div className="mt-2">
              <DetailStatusBadge
                status={isOverdue ? "overdue" : invoice.status}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Due</p>
            <p
              data-testid="invoice-amount"
              className="text-3xl font-bold text-card-foreground"
            >
              {formatCurrency(invoice.total)}
            </p>
          </div>
        </div>

        {/* Line items */}
        <div className="border-t pt-4">
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(invoice.amount)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatCurrency(invoice.tax)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span data-testid="invoice-total">
              {formatCurrency(invoice.total)}
            </span>
          </div>
        </div>

        {/* Due date */}
        <div className="mt-4 rounded-md bg-muted p-3">
          <p className="text-sm text-muted-foreground">Due Date</p>
          <p className="font-medium">{formatDate(invoice.dueDate)}</p>
        </div>

        {/* Payment countdown — shown on pending invoices for patient/admin */}
        {canPay && paymentState === "idle" && expiresAt != null && (
          <div className="mt-6">
            <PaymentCountdown expiresAt={expiresAt} />
          </div>
        )}

        {/* Server error */}
        {serverError && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </p>
        )}

        {/* Payment success */}
        {paymentState === "success" && (
          <div
            data-testid="payment-success-panel"
            className="mt-6 rounded-lg bg-green-50 p-4 text-green-800"
          >
            <p className="font-semibold">Payment Successful!</p>
            <p className="mt-1 text-sm">
              Your invoice has been paid. A confirmation will be sent to your
              email.
            </p>
          </div>
        )}

        {/* Payment failure */}
        {paymentState === "failure" && (
          <div
            data-testid="payment-failure-panel"
            className="mt-6 rounded-lg bg-destructive/10 p-4 text-destructive"
          >
            <p className="font-semibold">Payment Failed</p>
            <p className="mt-1 text-sm">
              {serverError ??
                "Your payment could not be processed. Please try again."}
            </p>
          </div>
        )}

        {/* Payment simulation buttons */}
        {canPay && paymentState === "idle" && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Payment simulation — choose an outcome:
            </p>
            <div className="flex gap-3">
              <button
                data-testid="payment-simulate-success"
                onClick={() => handlePayment(true)}
                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Simulate Success
              </button>
              <button
                data-testid="payment-simulate-fail"
                onClick={() => handlePayment(false)}
                className="flex-1 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                Simulate Failure
              </button>
            </div>
          </div>
        )}

        {/* Already paid info */}
        {invoice.status === "paid" && invoice.paidAt && (
          <div className="mt-6 rounded-lg bg-green-50 p-4 text-green-800">
            <p className="font-semibold">Paid</p>
            <p className="mt-1 text-sm">
              This invoice was paid on {formatDate(invoice.paidAt)}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
