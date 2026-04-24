import { useState } from "react";
import { useParams, Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { toast } from "sonner";
import {
  appointmentsApi,
  medicalRecordsApi,
  reviewsApi,
  type ApiError,
} from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type {
  Appointment,
  AppointmentStatus,
  MedicalRecord,
  Review,
  User,
  Patient,
  Doctor,
} from "@caresync/shared";
import { StatusBadge } from "./components/StatusBadge";
import { StarRating } from "@/components/ui/StarRating";

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
      toast.success("Medical record created successfully");
    } catch (err) {
      const msg =
        (err as ApiError)?.response?.data?.message ??
        "Failed to create medical record.";
      setError(msg);
      toast.error(msg);
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

// ─── Review Section ───────────────────────────────────────────────────────────

interface ReviewSectionProps {
  appointmentId: string;
  isPatient: boolean;
  status: AppointmentStatus;
}

function ReviewSection({
  appointmentId,
  isPatient,
  status,
}: ReviewSectionProps) {
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isPatient && status === "completed");

  // Load existing review (only for completed appointments owned by patient)
  if (isPatient && status === "completed" && loading) {
    const cancelled = false;
    reviewsApi
      .getByAppointment(appointmentId)
      .then((review) => {
        if (!cancelled) {
          setExistingReview(review);
          setDone(true);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return <div className="py-4 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!isPatient || status !== "completed") return null;
  if (loading) return null;

  if (done || existingReview) {
    return (
      <div
        className="rounded-lg border border-border bg-card p-6"
        data-testid="review-submitted"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-500 text-xl">✓</span>
          <h2 className="text-base font-semibold text-foreground">
            Review Submitted
          </h2>
        </div>
        {(existingReview || (done && rating > 0)) && (
          <div className="mt-3">
            <StarRating rating={existingReview?.rating ?? rating} size="sm" />
            {(existingReview?.comment || comment) && (
              <p className="mt-2 text-sm text-muted-foreground italic">
                "{existingReview?.comment ?? comment}"
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || comment.length > 500) return;
    setSubmitting(true);
    setError(null);
    try {
      await reviewsApi.create({
        appointmentId,
        rating,
        comment: comment.trim() || null,
      });
      setDone(true);
      toast.success("Review submitted successfully");
    } catch (err) {
      const msg =
        (err as ApiError)?.response?.data?.message ??
        "Failed to submit review.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isOverLimit = comment.length > 500;

  return (
    <div
      className="rounded-lg border border-border bg-card p-6"
      data-testid="review-section"
    >
      <h2 className="mb-4 text-base font-semibold text-foreground">
        How was your visit?
      </h2>

      {error && (
        <p
          data-testid="review-error"
          className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Rating</label>
          <StarRating
            rating={rating}
            onChange={setRating}
            disabled={submitting}
            size="lg"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="review-comment" className="text-sm font-medium">
            Comment{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <textarea
            id="review-comment"
            data-testid="review-comment-input"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={submitting}
            className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none ${
              isOverLimit
                ? "border-destructive ring-destructive"
                : "border-input"
            }`}
            placeholder="Share your experience…"
          />
          <div className="flex justify-end">
            <p
              className={`text-xs ${isOverLimit ? "text-destructive font-bold" : "text-muted-foreground"}`}
            >
              {comment.length}/500
            </p>
          </div>
        </div>

        <button
          type="submit"
          data-testid="review-submit"
          disabled={submitting || rating === 0 || isOverLimit}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit Review"}
        </button>
      </form>
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
      const statusLabel = targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1);
      toast.success(`Appointment ${statusLabel.toLowerCase() === "cancelled" ? "cancelled" : "updated"} successfully`);
    } catch (err) {
      const msg =
        (err as ApiError)?.response?.data?.message ??
        "Failed to update appointment status.";
      setActionError(msg);
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  }

  const status = appointment.status as AppointmentStatus;
  const actions = getActions(user?.role, status);

  const patient = appointment.patient as Patient & { user: User };
  const doctor = appointment.doctor as Doctor & { user: User };

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

        {/* Review section */}
        <ReviewSection
          appointmentId={appointment.id}
          isPatient={user?.role === "patient"}
          status={status}
        />
      </div>
    </div>
  );
}
