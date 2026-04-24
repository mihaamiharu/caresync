import { useState, useSyncExternalStore } from "react";
import {
  useParams,
  useNavigate,
  useLoaderData,
  useNavigation,
} from "react-router";
import { doctorsApi, schedulesApi, reviewsApi } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { Doctor, DoctorSchedule, DoctorReview } from "@caresync/shared";
import { ArrowLeft, Mail, Phone, Award, Building2, Star } from "lucide-react";
import { StarRating } from "@/components/ui/StarRating";

// ─── Loader ────────────────────────────────────────────────────────────────────

export async function doctorProfileLoader({
  params,
}: {
  params: { id?: string };
}) {
  const id = params.id!;
  const [doctor, schedule] = await Promise.all([
    doctorsApi.getDoctor(id),
    schedulesApi.getSchedule(id),
  ]);
  return { doctor, schedule };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];

// ─── Schedule form (owning doctor only) ──────────────────────────────────────

interface DayConfig {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

const defaultDayConfig: DayConfig = {
  enabled: false,
  startTime: "09:00",
  endTime: "17:00",
};

function makeInitialDays(
  schedule: DoctorSchedule[]
): Record<DayKey, DayConfig> {
  const base = Object.fromEntries(
    DAYS.map((d) => [d.key, { ...defaultDayConfig }])
  ) as Record<DayKey, DayConfig>;

  for (const row of schedule) {
    const key = row.dayOfWeek as DayKey;
    if (base[key]) {
      base[key] = {
        enabled: true,
        startTime: row.startTime,
        endTime: row.endTime,
      };
    }
  }
  return base;
}

function DoctorScheduleForm({
  doctorId,
  schedule,
}: {
  doctorId: string;
  schedule: DoctorSchedule[];
}) {
  const [slotDuration, setSlotDuration] = useState(() =>
    schedule.length > 0 ? schedule[0].slotDurationMinutes : 30
  );
  const [days, setDays] = useState<Record<DayKey, DayConfig>>(() =>
    makeInitialDays(schedule)
  );
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (key: DayKey) => {
    setDays((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }));
  };

  const updateTime = (
    key: DayKey,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setDays((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    setError(null);

    const activeDays = DAYS.filter((d) => days[d.key].enabled).map((d) => ({
      dayOfWeek: d.key,
      startTime: days[d.key].startTime,
      endTime: days[d.key].endTime,
    }));

    try {
      await schedulesApi.putSchedule(doctorId, {
        slotDurationMinutes: slotDuration,
        days: activeDays,
      });
      setSuccess(true);
    } catch (err) {
      const axiosErr = err as {
        response?: { data?: { message?: string } };
      };
      setError(axiosErr.response?.data?.message ?? "Failed to save schedule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      data-testid="schedule-form"
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {success && (
        <p
          data-testid="schedule-success"
          className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700"
        >
          Schedule saved successfully.
        </p>
      )}
      {error && (
        <p
          data-testid="schedule-error"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <label
          htmlFor="slot-duration"
          className="text-sm font-medium text-foreground"
        >
          Slot duration (min)
        </label>
        <input
          id="slot-duration"
          data-testid="slot-duration-input"
          type="number"
          min={5}
          max={120}
          value={slotDuration}
          onChange={(e) => setSlotDuration(Number(e.target.value))}
          className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm"
        />
      </div>

      <div className="space-y-3">
        {DAYS.map(({ key, label }) => (
          <div key={key} className="flex flex-wrap items-center gap-3">
            <label className="flex w-28 cursor-pointer items-center gap-2 text-sm">
              <input
                data-testid={`day-toggle-${key}`}
                type="checkbox"
                checked={days[key].enabled}
                onChange={() => toggleDay(key)}
                className="rounded"
              />
              {label}
            </label>

            {days[key].enabled && (
              <div className="flex items-center gap-2">
                <input
                  data-testid={`start-time-${key}`}
                  type="time"
                  value={days[key].startTime}
                  onChange={(e) => updateTime(key, "startTime", e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <input
                  data-testid={`end-time-${key}`}
                  type="time"
                  value={days[key].endTime}
                  onChange={(e) => updateTime(key, "endTime", e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        data-testid="schedule-submit"
        type="submit"
        disabled={submitting}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save Schedule"}
      </button>
    </form>
  );
}

// ─── Availability viewer (all users) ─────────────────────────────────────────

function displayTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function DoctorAvailabilityViewer({ doctorId }: { doctorId: string }) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  const fetchSlots = (d: string) => {
    setLoading(true);
    setFetched(false);
    setSlotError(null);
    schedulesApi
      .getAvailableSlots(doctorId, d)
      .then((result) => {
        setSlots(result);
      })
      .catch(() => {
        setSlots([]);
        setSlotError("Failed to load available slots. Please try again.");
      })
      .finally(() => {
        setLoading(false);
        setFetched(true);
      });
  };

  return (
    <div data-testid="slot-viewer" className="space-y-4">
      <input
        data-testid="slot-date-picker"
        type="date"
        value={date}
        onChange={(e) => {
          setDate(e.target.value);
          if (e.target.value) fetchSlots(e.target.value);
        }}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
      />

      {loading && (
        <p data-testid="slot-loading" className="text-sm text-muted-foreground">
          Loading slots…
        </p>
      )}

      {fetched && !loading && slotError && (
        <p
          data-testid="slot-fetch-error"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {slotError}
        </p>
      )}

      {fetched && !loading && !slotError && slots.length === 0 && (
        <p
          data-testid="slot-empty"
          className="text-sm text-muted-foreground italic"
        >
          No available slots for this date.
        </p>
      )}

      {fetched && !loading && !slotError && slots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {slots.map((iso) => (
            <button
              key={iso}
              data-testid={`slot-${iso}`}
              type="button"
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              {displayTime(iso)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Reviews Section ─────────────────────────────────────────────────────────

interface ReviewsSectionProps {
  doctorId: string;
  initialAverageRating: number | null;
  initialReviewCount: number;
}

function ReviewsSection({
  doctorId,
  initialAverageRating,
  initialReviewCount,
}: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 5;

  const loadReviews = (pageNum: number) => {
    setLoading(true);
    reviewsApi
      .getByDoctor(doctorId, { page: pageNum, limit })
      .then((res) => {
        setReviews(res.data);
        setTotalPages(res.totalPages);
        setPage(res.page);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useSyncExternalStore(
    () => () => {},
    () => "ready",
    () => "ready"
  );

  if (initialReviewCount === 0 && reviews.length === 0) {
    return (
      <div
        className="rounded-lg border border-border bg-card p-6"
        data-testid="reviews-section"
      >
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Patient Reviews
        </h2>
        <p className="text-sm text-muted-foreground py-4">No reviews yet.</p>
      </div>
    );
  }

  const avgRating = initialAverageRating ?? 0;

  return (
    <div
      className="rounded-lg border border-border bg-card p-6"
      data-testid="reviews-section"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">
          Patient Reviews
        </h2>
        {initialReviewCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-yellow-400 text-lg">★</span>
            <span className="font-medium text-sm">
              {avgRating > 0 ? avgRating.toFixed(1) : "N/A"}
            </span>
            <span className="text-sm text-muted-foreground">
              ({initialReviewCount})
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No reviews yet.</p>
      ) : (
        <>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">
                    {review.patientFirstName}{" "}
                    {review.patientLastName?.charAt(0)}.
                  </span>
                  <div className="flex items-center gap-1">
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground">
                    {review.comment}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                data-testid="reviews-prev"
                disabled={page <= 1 || loading}
                onClick={() => {
                  const p = page - 1;
                  setPage(p);
                  loadReviews(p);
                }}
                className="px-3 py-1 text-sm rounded-md border border-border hover:bg-muted disabled:opacity-50"
              >
                ← Prev
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                data-testid="reviews-next"
                disabled={page >= totalPages || loading}
                onClick={() => {
                  const p = page + 1;
                  setPage(p);
                  loadReviews(p);
                }}
                className="px-3 py-1 text-sm rounded-md border border-border hover:bg-muted disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Doctor profile page ──────────────────────────────────────────────────────

export function DoctorProfilePage() {
  const { doctor, schedule } = useLoaderData() as {
    doctor: Doctor;
    schedule: DoctorSchedule[];
  };
  const navigation = useNavigation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  if (navigation.state === "loading") {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading profile…
      </div>
    );
  }

  const fullName = `Dr. ${doctor.user?.firstName} ${doctor.user?.lastName}`;
  const isOwnProfile = user?.role === "doctor" && user.id === doctor.userId;

  return (
    <div data-testid="doctor-profile-page">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to list
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 h-32 w-32 overflow-hidden rounded-full bg-muted ring-4 ring-primary/10">
                {doctor.user?.avatarUrl ? (
                  <img
                    src={doctor.user.avatarUrl}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl">
                    👨‍⚕️
                  </div>
                )}
              </div>
              <h1 className="text-xl font-bold text-foreground">{fullName}</h1>
              <p className="text-primary font-medium">
                {doctor.specialization}
              </p>
              <div className="mt-2 flex items-center gap-1">
                <StarRating
                  rating={Math.round(doctor.averageRating ?? 0)}
                  size="sm"
                />
                <span className="ml-1 text-sm text-muted-foreground">
                  (
                  {doctor.averageRating != null
                    ? doctor.averageRating.toFixed(1)
                    : "N/A"}
                  )
                </span>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                <span>{doctor.department?.name} Department</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Award className="h-4 w-4 text-primary" />
                <span>License: {doctor.licenseNumber}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span>{doctor.user?.email}</span>
              </div>
              {doctor.user?.phone && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>{doctor.user.phone}</span>
                </div>
              )}
            </div>

            <button
              className="mt-8 w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              onClick={() => alert("Appointment booking coming soon!")}
            >
              Book Appointment
            </button>
          </div>
        </div>

        {/* Right Column: Bio, Schedule Form & Availability Viewer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              About
            </h2>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {doctor.bio || "No biography provided."}
            </p>
          </div>

          {/* Schedule management — owning doctor only */}
          {isOwnProfile && (
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                Manage Schedule
              </h2>
              <DoctorScheduleForm doctorId={id!} schedule={schedule} />
            </div>
          )}

          {/* Availability viewer — all users */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Available Slots
            </h2>
            <DoctorAvailabilityViewer doctorId={doctor.id} />
          </div>

          {/* Patient Reviews */}
          <ReviewsSection
            doctorId={doctor.id}
            initialAverageRating={doctor.averageRating}
            initialReviewCount={doctor.reviewCount}
          />
        </div>
      </div>
    </div>
  );
}
