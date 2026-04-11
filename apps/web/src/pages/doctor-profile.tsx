import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { doctorsApi } from "@/lib/api-client";
import type { Doctor } from "@caresync/shared";
import {
  ArrowLeft,
  Mail,
  Phone,
  Award,
  Building2,
  Calendar,
  Star,
} from "lucide-react";

export function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    doctorsApi
      .getDoctor(id)
      .then((res) => {
        setDoctor(res);
      })
      .catch(() => {
        setError("Failed to load doctor profile.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading profile…
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
        {error || "Doctor not found."}
      </div>
    );
  }

  const fullName = `Dr. ${doctor.user?.firstName} ${doctor.user?.lastName}`;

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
              <div className="mt-2 flex items-center gap-1 text-yellow-500">
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4" />
                <span className="ml-1 text-sm text-muted-foreground">
                  (4.0)
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

        {/* Right Column: Bio & Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              About
            </h2>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {doctor.bio || "No biography provided."}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Availability
              </h2>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground italic">
              Doctor's regular schedule will be displayed here. (Work in
              progress)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
