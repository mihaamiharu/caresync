import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  Stethoscope,
  Building2,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  departmentsApi,
  doctorsApi,
  schedulesApi,
  appointmentsApi,
} from "@/lib/api-client";
import type { Department, Doctor, AppointmentType } from "@caresync/shared";
import { APPOINTMENT_TYPES } from "@caresync/shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatJakartaTime(isoUtc: string): string {
  return new Date(isoUtc).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function todayISO(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
}

function maxDateISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
}

// ─── Wizard state ─────────────────────────────────────────────────────────────

interface WizardState {
  step: 1 | 2 | 3 | 4 | 5;
  completedSteps: Set<number>;
  // Step 1
  departmentId: string;
  departmentName: string;
  // Step 2
  doctorId: string;
  doctorName: string;
  // Step 3
  appointmentDate: string;
  startTime: string; // ISO UTC
  // Step 4
  type: AppointmentType;
  reason: string;
  notes: string;
  // Step 5 success
  appointmentId: string;
}

const initialState: WizardState = {
  step: 1,
  completedSteps: new Set(),
  departmentId: "",
  departmentName: "",
  doctorId: "",
  doctorName: "",
  appointmentDate: "",
  startTime: "",
  type: "consultation",
  reason: "",
  notes: "",
  appointmentId: "",
};

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { label: "Department", icon: Building2 },
  { label: "Doctor", icon: Stethoscope },
  { label: "Date & Time", icon: CalendarDays },
  { label: "Details", icon: ClipboardList },
  { label: "Confirmed", icon: Check },
];

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}

function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <nav
      aria-label="Booking steps"
      className="flex items-center justify-center gap-0"
    >
      {STEPS.map((s, i) => {
        const stepNum = i + 1;
        const isCompleted = completedSteps.has(stepNum);
        const isCurrent = currentStep === stepNum;
        const isClickable = isCompleted && stepNum < currentStep;

        return (
          <div key={stepNum} className="flex items-center">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(stepNum)}
              data-testid={`step-indicator-${stepNum}`}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                isCurrent && "bg-primary text-primary-foreground",
                isCompleted &&
                  !isCurrent &&
                  "bg-primary/20 text-primary hover:bg-primary/30",
                !isCurrent && !isCompleted && "bg-muted text-muted-foreground",
                isClickable && "cursor-pointer"
              )}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Step ${stepNum}: ${s.label}`}
            >
              {isCompleted && !isCurrent ? (
                <Check className="h-4 w-4" />
              ) : (
                stepNum
              )}
            </button>
            <span
              className={cn(
                "ml-2 hidden text-xs font-medium sm:block",
                isCurrent ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="mx-3 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ─── Step 1: Department ───────────────────────────────────────────────────────

function Step1Department({
  onSelect,
}: {
  onSelect: (id: string, name: string) => void;
}) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    departmentsApi
      .listDepartments({ limit: 100 })
      .then((res) => setDepartments(res.data.filter((d) => d.isActive)))
      .catch(() => setError("Failed to load departments. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CenteredLoader />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Select a Department</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Choose the medical specialty you need.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <button
            key={dept.id}
            type="button"
            data-testid={`department-card-${dept.id}`}
            onClick={() => onSelect(dept.id, dept.name)}
            className="flex flex-col items-start gap-1 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-accent"
          >
            <span className="font-medium">{dept.name}</span>
            {dept.description && (
              <span className="text-xs text-muted-foreground line-clamp-2">
                {dept.description}
              </span>
            )}
          </button>
        ))}
      </div>
      {departments.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No departments available.
        </p>
      )}
    </div>
  );
}

// ─── Step 2: Doctor ───────────────────────────────────────────────────────────

function Step2Doctor({
  departmentId,
  departmentName,
  onSelect,
  onBack,
}: {
  departmentId: string;
  departmentName: string;
  onSelect: (id: string, name: string) => void;
  onBack: () => void;
}) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    doctorsApi
      .listDoctors({ departmentId, limit: 100 })
      .then((res) => setDoctors(res.data))
      .catch(() => setError("Failed to load doctors. Please try again."))
      .finally(() => setLoading(false));
  }, [departmentId]);

  if (loading) return <CenteredLoader />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Select a Doctor</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Doctors in <span className="font-medium">{departmentName}</span>
      </p>
      {doctors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No doctors available in this department.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {doctors.map((doc) => (
            <button
              key={doc.id}
              type="button"
              data-testid={`doctor-card-${doc.id}`}
              onClick={() =>
                onSelect(
                  doc.id,
                  `Dr. ${doc.user?.firstName ?? ""} ${doc.user?.lastName ?? ""}`.trim()
                )
              }
              className="flex flex-col items-start gap-1 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-accent"
            >
              <span className="font-medium">
                Dr. {doc.user?.firstName} {doc.user?.lastName}
              </span>
              <span className="text-xs text-muted-foreground">
                {doc.specialization}
              </span>
              {doc.bio && (
                <span className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {doc.bio}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <BackButton onClick={onBack} />
    </div>
  );
}

// ─── Step 3: Date & Time ──────────────────────────────────────────────────────

function Step3DateTime({
  doctorId,
  doctorName,
  appointmentDate,
  startTime,
  onDateChange,
  onSlotSelect,
  onNext,
  onBack,
}: {
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  startTime: string;
  onDateChange: (date: string) => void;
  onSlotSelect: (slot: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const fetchSlots = useCallback(
    (date: string) => {
      if (!date) return;
      setLoadingSlots(true);
      setSlotsError(null);
      schedulesApi
        .getAvailableSlots(doctorId, date)
        .then(setSlots)
        .catch(() => setSlotsError("Failed to load time slots."))
        .finally(() => setLoadingSlots(false));
    },
    [doctorId]
  );

  useEffect(() => {
    if (appointmentDate) fetchSlots(appointmentDate);
  }, [appointmentDate, fetchSlots]);

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Select Date & Time</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Booking with <span className="font-medium">{doctorName}</span>
      </p>

      <div className="mb-6">
        <label htmlFor="appt-date" className="mb-1 block text-sm font-medium">
          Appointment Date
        </label>
        <input
          id="appt-date"
          type="date"
          data-testid="date-picker"
          min={todayISO()}
          max={maxDateISO()}
          value={appointmentDate}
          onChange={(e) => {
            onDateChange(e.target.value);
            onSlotSelect(""); // reset slot when date changes
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {appointmentDate && (
        <div>
          <p className="mb-3 text-sm font-medium">Available Time Slots</p>

          {loadingSlots && <CenteredLoader />}

          {!loadingSlots && slotsError && <ErrorMessage message={slotsError} />}

          {!loadingSlots && !slotsError && slots.length === 0 && (
            <p
              className="text-sm text-muted-foreground"
              data-testid="no-slots-message"
            >
              {doctorName} is not available on this day — please pick another
              date.
            </p>
          )}

          {!loadingSlots && !slotsError && slots.length > 0 && (
            <div className="flex flex-wrap gap-2" data-testid="slot-grid">
              {slots.map((slot) => (
                <SlotButton
                  key={slot}
                  slot={slot}
                  selected={startTime === slot}
                  onClick={() => onSlotSelect(slot)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <BackButton onClick={onBack} />
        <button
          type="button"
          disabled={!appointmentDate || !startTime}
          onClick={onNext}
          data-testid="step3-next"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function SlotButton({
  slot,
  selected,
  onClick,
}: {
  slot: string;
  selected: boolean;
  onClick: () => void;
}) {
  const label = formatJakartaTime(slot);

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        data-testid={`slot-${slot}`}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border hover:border-primary hover:bg-accent"
        )}
      >
        <Clock className="h-3.5 w-3.5 shrink-0" />
        {label}
      </button>
      {/* Tooltip */}
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100"
      >
        Jakarta time (WIB, UTC+7)
      </div>
    </div>
  );
}

// ─── Step 4: Details & Confirm ────────────────────────────────────────────────

function Step4Details({
  state,
  onTypeChange,
  onReasonChange,
  onNotesChange,
  onSubmit,
  onBack,
  submitting,
  submitError,
}: {
  state: WizardState;
  onTypeChange: (t: AppointmentType) => void;
  onReasonChange: (r: string) => void;
  onNotesChange: (n: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  submitError: string | null;
}) {
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Confirm Your Appointment</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Review your details and complete the booking.
      </p>

      {/* Summary */}
      <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-2">
        <SummaryRow label="Department" value={state.departmentName} />
        <SummaryRow label="Doctor" value={state.doctorName} />
        <SummaryRow label="Date" value={formatDate(state.appointmentDate)} />
        <SummaryRow
          label="Time"
          value={`${formatJakartaTime(state.startTime)} WIB`}
        />
      </div>

      {/* Type */}
      <div className="mb-4">
        <label htmlFor="appt-type" className="mb-1 block text-sm font-medium">
          Appointment Type <span className="text-destructive">*</span>
        </label>
        <select
          id="appt-type"
          data-testid="appointment-type"
          value={state.type}
          onChange={(e) => onTypeChange(e.target.value as AppointmentType)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {APPOINTMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1).replace("-", " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Reason */}
      <div className="mb-4">
        <label htmlFor="appt-reason" className="mb-1 block text-sm font-medium">
          Reason for Visit
        </label>
        <textarea
          id="appt-reason"
          data-testid="reason-input"
          value={state.reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={3}
          placeholder="Describe your symptoms or reason for the visit…"
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label htmlFor="appt-notes" className="mb-1 block text-sm font-medium">
          Additional Notes
        </label>
        <textarea
          id="appt-notes"
          data-testid="notes-input"
          value={state.notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={2}
          placeholder="Any other information for the doctor…"
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {submitError && (
        <div
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          data-testid="submit-error"
        >
          {submitError}
        </div>
      )}

      <div className="flex gap-3">
        <BackButton onClick={onBack} disabled={submitting} />
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          data-testid="confirm-button"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Booking…" : "Confirm Booking"}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("en-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

// ─── Step 5: Success ──────────────────────────────────────────────────────────

function Step5Success({
  state,
  onBookAnother,
}: {
  state: WizardState;
  onBookAnother: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Check className="h-8 w-8 text-primary" />
      </div>
      <h2 className="mb-2 text-xl font-semibold">Appointment Booked!</h2>
      <p className="mb-8 text-sm text-muted-foreground">
        Your appointment has been submitted and is awaiting confirmation.
      </p>

      <div className="mb-8 w-full max-w-sm rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-2 text-left">
        <SummaryRow label="Department" value={state.departmentName} />
        <SummaryRow label="Doctor" value={state.doctorName} />
        <SummaryRow label="Date" value={formatDate(state.appointmentDate)} />
        <SummaryRow
          label="Time"
          value={`${formatJakartaTime(state.startTime)} WIB`}
        />
        <SummaryRow
          label="Type"
          value={
            state.type.charAt(0).toUpperCase() +
            state.type.slice(1).replace("-", " ")
          }
        />
        <SummaryRow label="Status" value="Pending confirmation" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => navigate("/appointments")}
          data-testid="view-appointments-button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          View My Appointments
        </button>
        <button
          type="button"
          onClick={onBookAnother}
          data-testid="book-another-button"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          Book Another
        </button>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function CenteredLoader() {
  return (
    <div className="flex justify-center py-8" data-testid="loader">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      data-testid="error-message"
    >
      {message}
    </div>
  );
}

function BackButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid="back-button"
      className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
    >
      Back
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function BookAppointmentPage() {
  const [state, setState] = useState<WizardState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const goToStep = (step: WizardState["step"]) => {
    setState((s) => ({ ...s, step }));
  };

  const markCompleted = (step: number) => {
    setState((s) => ({
      ...s,
      completedSteps: new Set([...s.completedSteps, step]),
    }));
  };

  const handleStepClick = (step: number) => {
    goToStep(step as WizardState["step"]);
  };

  // Step 1 → 2
  const handleDepartmentSelect = (id: string, name: string) => {
    setState((s) => ({
      ...s,
      departmentId: id,
      departmentName: name,
      // reset downstream
      doctorId: "",
      doctorName: "",
      appointmentDate: "",
      startTime: "",
      type: "consultation",
      reason: "",
      notes: "",
      step: 2,
      completedSteps: new Set([...s.completedSteps, 1]),
    }));
  };

  // Step 2 → 3
  const handleDoctorSelect = (id: string, name: string) => {
    setState((s) => ({
      ...s,
      doctorId: id,
      doctorName: name,
      appointmentDate: "",
      startTime: "",
      step: 3,
      completedSteps: new Set([...s.completedSteps, 2]),
    }));
  };

  // Step 3 navigation
  const handleStep3Next = () => {
    markCompleted(3);
    goToStep(4);
  };

  const handleStep3Back = () => goToStep(2);
  const handleStep4Back = () => goToStep(3);

  // Submit (Step 4 → 5)
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const appt = await appointmentsApi.create({
        doctorId: state.doctorId,
        appointmentDate: state.appointmentDate,
        startTime: state.startTime,
        type: state.type,
        reason: state.reason || undefined,
        notes: state.notes || undefined,
      });
      setState((s) => ({
        ...s,
        appointmentId: appt.id,
        step: 5,
        completedSteps: new Set([...s.completedSteps, 4]),
      }));
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        setSubmitError(
          "This slot was just booked by someone else — please go back and select another time."
        );
      } else {
        setSubmitError(
          err?.response?.data?.message ??
            "Failed to book appointment. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle 409: send user back to step 3
  useEffect(() => {
    if (submitError?.includes("just booked")) {
      // clear the selected slot so they must re-pick
      setState((s) => ({ ...s, startTime: "" }));
    }
  }, [submitError]);

  const handleBookAnother = () => {
    setState(initialState);
    setSubmitError(null);
  };

  return (
    <div className="mx-auto max-w-3xl p-6" data-testid="book-appointment-page">
      <div className="mb-8">
        <h1 className="mb-1 text-2xl font-bold">Book an Appointment</h1>
        <p className="text-sm text-muted-foreground">
          Complete the steps below to schedule your visit.
        </p>
      </div>

      <div className="mb-8 rounded-lg border border-border bg-card p-4">
        <StepIndicator
          currentStep={state.step}
          completedSteps={state.completedSteps}
          onStepClick={handleStepClick}
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        {state.step === 1 && (
          <Step1Department onSelect={handleDepartmentSelect} />
        )}
        {state.step === 2 && (
          <Step2Doctor
            departmentId={state.departmentId}
            departmentName={state.departmentName}
            onSelect={handleDoctorSelect}
            onBack={() => goToStep(1)}
          />
        )}
        {state.step === 3 && (
          <Step3DateTime
            doctorId={state.doctorId}
            doctorName={state.doctorName}
            appointmentDate={state.appointmentDate}
            startTime={state.startTime}
            onDateChange={(date) =>
              setState((s) => ({ ...s, appointmentDate: date }))
            }
            onSlotSelect={(slot) =>
              setState((s) => ({ ...s, startTime: slot }))
            }
            onNext={handleStep3Next}
            onBack={handleStep3Back}
          />
        )}
        {state.step === 4 && (
          <Step4Details
            state={state}
            onTypeChange={(t) => setState((s) => ({ ...s, type: t }))}
            onReasonChange={(r) => setState((s) => ({ ...s, reason: r }))}
            onNotesChange={(n) => setState((s) => ({ ...s, notes: n }))}
            onSubmit={handleSubmit}
            onBack={handleStep4Back}
            submitting={submitting}
            submitError={submitError}
          />
        )}
        {state.step === 5 && (
          <Step5Success state={state} onBookAnother={handleBookAnother} />
        )}
      </div>
    </div>
  );
}
