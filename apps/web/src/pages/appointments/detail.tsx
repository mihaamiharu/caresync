import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { appointmentsApi } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { Appointment, AppointmentStatus } from "@caresync/shared";
import { StatusBadge } from "./components/StatusBadge";

// ─── Role + status-aware action buttons ───────────────────────────────────────

interface ActionButton {
  label: string;
  targetStatus: AppointmentStatus;
  destructive?: boolean;
}

function getActions(
  role: string | undefined,
  currentStatus: AppointmentStatus
): ActionButton[] {
  if (role === "patient") {
    if (currentStatus === "pending" || currentStatus === "confirmed") {
      return [
        {
          label: "Cancel Appointment",
          targetStatus: "cancelled",
          destructive: true,
        },
      ];
    }
    return [];
  }

  if (role === "doctor") {
    const map: Partial<Record<AppointmentStatus, ActionButton[]>> = {
      pending: [{ label: "Confirm", targetStatus: "confirmed" }],
      confirmed: [{ label: "Start Appointment", targetStatus: "in-progress" }],
      "in-progress": [{ label: "Mark Completed", targetStatus: "completed" }],
    };
    return map[currentStatus] ?? [];
  }

  if (role === "admin") {
    const map: Partial<Record<AppointmentStatus, ActionButton[]>> = {
      pending: [
        { label: "Confirm", targetStatus: "confirmed" },
        { label: "Cancel", targetStatus: "cancelled", destructive: true },
      ],
      confirmed: [
        { label: "Start", targetStatus: "in-progress" },
        { label: "Cancel", targetStatus: "cancelled", destructive: true },
      ],
      "in-progress": [
        { label: "Complete", targetStatus: "completed" },
        { label: "Cancel", targetStatus: "cancelled", destructive: true },
      ],
    };
    return map[currentStatus] ?? [];
  }

  return [];
}

// ─── Detail row helper ─────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-3 border-b border-border last:border-0">
      <dt className="w-40 shrink-0 text-sm font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground mt-1 sm:mt-0">{value ?? "—"}</dd>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    appointmentsApi
      .get(id)
      .then((data) => setAppointment(data))
      .catch(() => setError("Appointment not found or you don't have access."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(
    targetStatus: AppointmentStatus,
    destructive?: boolean
  ) {
    if (!appointment || !id) return;

    if (destructive) {
      const confirmed = window.confirm(
        `Are you sure you want to ${targetStatus === "cancelled" ? "cancel" : "update"} this appointment? This action cannot be undone.`
      );
      if (!confirmed) return;
    }

    setUpdating(true);
    setActionError(null);
    try {
      const res = await appointmentsApi.updateStatus(id, targetStatus);
      setAppointment(res.appointment);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? "Failed to update appointment status.";
      setActionError(msg);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div
        data-testid="appointment-detail-loading"
        className="flex items-center justify-center py-24 text-muted-foreground"
      >
        Loading…
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div data-testid="appointment-detail-error" className="py-8">
        <p className="text-red-600 mb-4">{error ?? "Appointment not found."}</p>
        <Link
          to="/appointments"
          className="text-sm text-primary hover:underline"
        >
          ← Back to appointments
        </Link>
      </div>
    );
  }

  const status = appointment.status as AppointmentStatus;
  const actions = getActions(user?.role, status);

  const patient = appointment.patient as any;
  const doctor = appointment.doctor as any;

  return (
    <div data-testid="appointment-detail-page">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            to="/appointments"
            data-testid="back-to-appointments"
            className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to appointments
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Appointment Detail
          </h1>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Action error */}
      {actionError && (
        <div
          data-testid="action-error"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {/* Action buttons */}
      {actions.length > 0 && (
        <div
          data-testid="appointment-actions"
          className="mb-6 flex flex-wrap gap-3"
        >
          {actions.map((action) => (
            <button
              key={action.targetStatus}
              data-testid={`action-${action.targetStatus}`}
              disabled={updating}
              onClick={() =>
                handleStatusChange(action.targetStatus, action.destructive)
              }
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                action.destructive
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {updating ? "Updating…" : action.label}
            </button>
          ))}
        </div>
      )}

      {/* Appointment info */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appointment details */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Appointment Info
          </h2>
          <dl>
            <DetailRow label="Date" value={appointment.appointmentDate} />
            <DetailRow
              label="Time"
              value={`${appointment.startTime} – ${appointment.endTime}`}
            />
            <DetailRow
              label="Type"
              value={<span className="capitalize">{appointment.type}</span>}
            />
            <DetailRow
              label="Status"
              value={<StatusBadge status={status} withTestId={false} />}
            />
            <DetailRow label="Reason" value={appointment.reason} />
            <DetailRow label="Notes" value={appointment.notes} />
          </dl>
        </div>

        {/* Patient info */}
        {patient && (
          <div
            data-testid="patient-info"
            className="rounded-lg border border-border bg-card p-6"
          >
            <h2 className="mb-4 text-base font-semibold text-foreground">
              Patient
            </h2>
            <dl>
              <DetailRow
                label="Name"
                value={`${patient.user?.firstName ?? ""} ${patient.user?.lastName ?? ""}`}
              />
              <DetailRow label="Email" value={patient.user?.email} />
              <DetailRow label="Date of Birth" value={patient.dateOfBirth} />
              <DetailRow
                label="Gender"
                value={<span className="capitalize">{patient.gender}</span>}
              />
              <DetailRow label="Blood Type" value={patient.bloodType} />
              <DetailRow label="Allergies" value={patient.allergies} />
              <DetailRow
                label="Emergency Contact"
                value={
                  patient.emergencyContactName
                    ? `${patient.emergencyContactName} — ${patient.emergencyContactPhone ?? ""}`
                    : null
                }
              />
            </dl>
          </div>
        )}

        {/* Doctor info */}
        {doctor && (
          <div
            data-testid="doctor-info"
            className="rounded-lg border border-border bg-card p-6"
          >
            <h2 className="mb-4 text-base font-semibold text-foreground">
              Doctor
            </h2>
            <dl>
              <DetailRow
                label="Name"
                value={`${doctor.user?.firstName ?? ""} ${doctor.user?.lastName ?? ""}`}
              />
              <DetailRow label="Email" value={doctor.user?.email} />
              <DetailRow label="Specialization" value={doctor.specialization} />
              <DetailRow label="License" value={doctor.licenseNumber} />
              <DetailRow label="Bio" value={doctor.bio} />
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
