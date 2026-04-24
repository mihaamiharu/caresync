import { useState, useRef } from "react";
import { useLoaderData } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { usersApi, patientsApi } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { BLOOD_TYPES, GENDERS } from "@caresync/shared";
import type { Patient } from "@caresync/shared";

// ─── Loader ────────────────────────────────────────────────────────────────────

export async function profileLoader() {
  const patient = await patientsApi.getPatient().catch(() => null);
  return { patient };
}

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
});

type ProfileInput = z.infer<typeof profileSchema>;

// ─── Medical Information form (patient role only) ─────────────────────────────

const medicalSchema = z.object({
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodType: z.string().optional(),
  allergies: z.string().max(1000).optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().optional(),
});

type MedicalInput = z.infer<typeof medicalSchema>;

function MedicalInfoForm({ patient }: { patient: Patient | null }) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<MedicalInput>({
    resolver: zodResolver(medicalSchema),
    defaultValues: {
      dateOfBirth: patient?.dateOfBirth ?? "",
      gender: patient?.gender ?? "",
      bloodType: patient?.bloodType ?? "",
      allergies: patient?.allergies ?? "",
      emergencyContactName: patient?.emergencyContactName ?? "",
      emergencyContactPhone: patient?.emergencyContactPhone ?? "",
    },
  });

  const onSubmit = async (data: MedicalInput) => {
    try {
      await patientsApi.upsertPatient({
        dateOfBirth: data.dateOfBirth || null,
        gender: data.gender || null,
        bloodType: data.bloodType || null,
        allergies: data.allergies || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
      });
      toast.success("Medical information updated successfully");
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg ?? "Something went wrong. Please try again.");
    }
  };

  return (
    <div
      data-testid="medical-info-section"
      className="rounded-lg border border-border bg-card p-6"
    >
      <h2 className="mb-4 text-lg font-semibold text-card-foreground">
        Medical Information
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="dateOfBirth" className="text-sm font-medium">
              Date of birth
            </label>
            <input
              id="dateOfBirth"
              type="date"
              data-testid="dob-input"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register("dateOfBirth")}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="gender" className="text-sm font-medium">
              Gender
            </label>
            <select
              id="gender"
              data-testid="gender-select"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register("gender")}
            >
              <option value="">Select gender</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="bloodType" className="text-sm font-medium">
            Blood type
          </label>
          <select
            id="bloodType"
            data-testid="blood-type-select"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            {...register("bloodType")}
          >
            <option value="">Select blood type</option>
            {BLOOD_TYPES.map((bt) => (
              <option key={bt} value={bt}>
                {bt}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="allergies" className="text-sm font-medium">
            Allergies
          </label>
          <textarea
            id="allergies"
            data-testid="allergies-input"
            rows={3}
            maxLength={1000}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            {...register("allergies")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label
              htmlFor="emergencyContactName"
              className="text-sm font-medium"
            >
              Emergency contact name
            </label>
            <input
              id="emergencyContactName"
              type="text"
              data-testid="emergency-contact-name-input"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register("emergencyContactName")}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="emergencyContactPhone"
              className="text-sm font-medium"
            >
              Emergency contact phone
            </label>
            <input
              id="emergencyContactPhone"
              type="tel"
              data-testid="emergency-contact-phone-input"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register("emergencyContactPhone")}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="save-medical-button"
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Save medical info"}
        </button>
      </form>
    </div>
  );
}

export function ProfilePage() {
  const { patient } = useLoaderData() as { patient: Patient | null };
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      phone: user?.phone ?? "",
    },
  });

  const onSubmit = async (data: ProfileInput) => {
    try {
      const updated = await usersApi.updateProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
      });
      if (updated && accessToken) {
        setAuth(updated, accessToken);
      }
      toast.success("Profile updated successfully");
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg ?? "Something went wrong. Please try again.");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const updated = await usersApi.updateAvatar(formData);
      if (updated && accessToken) {
        setAuth(updated, accessToken);
      }
      toast.success("Avatar updated successfully");
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg ?? "Failed to upload avatar.");
    }
  };

  return (
    <div data-testid="profile-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account information
        </p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Avatar section */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">
            Profile Picture
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground overflow-hidden">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  data-testid="avatar-image"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span data-testid="avatar-initials">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </span>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                data-testid="avatar-upload-input"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                data-testid="avatar-upload-button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Change avatar
              </button>
              {avatarError && (
                <p
                  className="mt-1 text-xs text-destructive"
                  data-testid="avatar-error"
                >
                  {avatarError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Profile form */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">
            Personal Information
          </h2>

          <div className="mb-4">
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="mt-1 text-sm text-foreground">{user?.email}</p>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-muted-foreground">Role</p>
            <p className="mt-1 text-sm capitalize text-foreground">
              {user?.role}
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="firstName" className="text-sm font-medium">
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  data-testid="first-name-input"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p
                    className="text-xs text-destructive"
                    data-testid="first-name-error"
                  >
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="lastName" className="text-sm font-medium">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  data-testid="last-name-input"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register("lastName")}
                />
                {errors.lastName && (
                  <p
                    className="text-xs text-destructive"
                    data-testid="last-name-error"
                  >
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                data-testid="phone-input"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                {...register("phone")}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="save-profile-button"
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>

        {/* Medical Information — patient role only */}
        {user?.role === "patient" && <MedicalInfoForm patient={patient} />}
      </div>
    </div>
  );
}
