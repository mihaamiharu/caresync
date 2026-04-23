import { useState } from "react";
import { useParams, Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { appointmentsApi, medicalRecordsApi } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type {
  Appointment,
  AppointmentStatus,
  MedicalRecord,
} from "@caresync/shared";
import { StatusBadge } from "./components/StatusBadge";

// ─── Loader ────────────────────────────────────────────────────────────────────

export async function appointmentDetailLoader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response("Not found", { status: 404 });
  const [appointment, records] = await Promise.all([
    appointmentsApi.get(id),
    medicalRecordsApi
      .list({ appointmentId: id })
      .catch(() => [] as MedicalRecord[]),
  ]);
  return { appointment, medicalRecord: records[0] ?? null };
}

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

// ─── Inline Medical Record section ────────────────────────────────────────────

interface MedicalRecordSectionProps {
  appointmentId: string;
  initialRecord: MedicalRecord | null;
  role: string | undefined;
  status: AppointmentStatus;
}

function MedicalRecordSection({
  appointmentId,
  initialRecord,
  role,
  status,
}: MedicalRecordSectionProps) {
  const [record, setRecord] = useState<MedicalRecord | null>(initialRecord);
  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "completed") return null;
  if (!record && role !== "doctor") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await medicalRecordsApi.create({
        appointmentId,
        diagnosis,
        symptoms: symptoms || null,
        notes: notes || null,
      });
      setRecord(created);
    } catch (err) {
      const msg =
        err?.response?.data?.message ?? "Failed to create medical record.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="medical-record-section"
      className="rounded-lg border border-border bg-card p-6"
    >
      <h2 className="mb-4 text-base font-semibold text-foreground">
        Medical Record
      </h2>

      {record ? (
        // Read-only view
        <dl>
          <DetailRow
            label="Diagnosis"
            value={<span data-testid="mr-diagnosis">{record.diagnosis}</span>}
          />
          <DetailRow label="Symptoms" value={record.symptoms} />
          <DetailRow label="Notes" value={record.notes} />
          <DetailRow
            label="Created"
            value={new Date(record.createdAt).toLocaleString()}
          />
          <DetailRow
            label="Full Record"
            value={
              <Link
                to={`/medical-records/${record.id}`}
                className="text-primary hover:underline"
                data-testid="view-full-record"
              >
                View full record
              </Link>
            }
          />
        </dl>
      ) : (
        // Create form (doctor only)
        <form
          data-testid="medical-record-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {error && (
            <p
              data-testid="mr-error"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="mr-diagnosis" className="text-sm font-medium">
              Diagnosis <span className="text-destructive">*</span>
            </label>
            <textarea
              id="mr-diagnosis"
              data-testid="mr-diagnosis-input"
              rows={3}
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter diagnosis…"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="mr-symptoms" className="text-sm font-medium">
              Symptoms
            </label>
            <textarea
              id="mr-symptoms"
              data-testid="mr-symptoms-input"
              rows={2}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Describe symptoms…"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="mr-notes" className="text-sm font-medium">
              Notes
            </label>
            <textarea
              id="mr-notes"
              data-testid="mr-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Additional notes…"
            />
          </div>

          <button
            type="submit"
            data-testid="mr-submit"
            disabled={submitting || !diagnosis.trim()}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save Medical Record"}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { appointment: initialData, medicalRecord: initialRecord } =
    useLoaderData() as {
      appointment: Appointment;
      medicalRecord: MedicalRecord | null;
    };
  const user = useAuthStore((s) => s.user);

  const [appointment, setAppointment] = useState<Appointment>(initialData);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  async function handleStatusChange(
    targetStatus: AppointmentStatus,
    destructive?: boolean
  ) {
    if (!id) return;

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
    } catch (err) {
      const msg =
        err?.response?.data?.message ?? "Failed to update appointment status.";
      setActionError(msg);
    } finally {
      setUpdating(false);
    }
  }

  const status = appointment.status as AppointmentStatus;
  const actions = getActions(user?.role, status);

  const patient = appointment.patient as never;
  const doctor = appointment.doctor as never;

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

        {/* Medical Record section */}
        <MedicalRecordSection
          appointmentId={appointment.id}
          initialRecord={initialRecord}
          role={user?.role}
          status={status}
        />
      </div>
    </div>
  );
}
