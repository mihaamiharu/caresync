import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router";
import { appointmentsApi } from "@/lib/api-client";
import type { AppointmentListItem } from "@/lib/api-client";
import { APPOINTMENT_STATUSES } from "@caresync/shared";
import type { AppointmentStatus } from "@caresync/shared";
import { StatusBadge } from "./components/StatusBadge";

const LIMIT = 10;

export function AppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1");
  const status = searchParams.get("status") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const [appointments, setAppointments] = useState<AppointmentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await appointmentsApi.list({
        page,
        limit: LIMIT,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setAppointments(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setError("Failed to load appointments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, status, from, to]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    // Reset to page 1 when filters change
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  }

  return (
    <div data-testid="appointments-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            {total} appointment{total !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          data-testid="status-filter"
          value={status}
          onChange={(e) => setParam("status", e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All statuses</option>
          {APPOINTMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <input
          type="date"
          data-testid="from-date-filter"
          value={from}
          onChange={(e) => setParam("from", e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="date"
          data-testid="to-date-filter"
          value={to}
          onChange={(e) => setParam("to", e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {(status || from || to) && (
          <button
            data-testid="clear-filters"
            onClick={() => setSearchParams(new URLSearchParams({ page: "1" }))}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div
          data-testid="appointments-error"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Patient
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Doctor
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Type
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={6}
                  data-testid="appointments-loading"
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            )}
            {!loading && appointments.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  data-testid="appointments-empty"
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No appointments found.
                </td>
              </tr>
            )}
            {!loading &&
              appointments.map((appt) => (
                <tr
                  key={appt.id}
                  data-testid={`appointment-row-${appt.id}`}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-foreground">
                    <div className="font-medium">{appt.appointmentDate}</div>
                    <div className="text-xs text-muted-foreground">
                      {appt.startTime} – {appt.endTime}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {appt.patientName}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    <div>{appt.doctorName}</div>
                    <div className="text-xs text-muted-foreground">
                      {appt.doctorSpecialization}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {appt.type}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={appt.status as AppointmentStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/appointments/${appt.id}`}
                      data-testid={`view-appointment-${appt.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          data-testid="pagination"
          className="mt-4 flex items-center justify-between"
        >
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              data-testid="prev-page"
              disabled={page <= 1}
              onClick={() => setParam("page", String(page - 1))}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-muted transition-colors"
            >
              Previous
            </button>
            <button
              data-testid="next-page"
              disabled={page >= totalPages}
              onClick={() => setParam("page", String(page + 1))}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
