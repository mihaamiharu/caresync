import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { doctorsApi, departmentsApi } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { Doctor, Department } from "@caresync/shared";

// ─── Form schema ───────────────────────────────────────────────────────────────

const doctorFormSchema = z.object({
  email: z.string().email("Invalid email").min(1, "Email is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  departmentId: z.string().uuid("Please select a department"),
  specialization: z.string().min(1, "Specialization is required"),
  bio: z.string().optional(),
  licenseNumber: z.string().min(1, "License number is required"),
});

type DoctorFormInput = z.infer<typeof doctorFormSchema>;

// ─── Doctor Form Modal ─────────────────────────────────────────────────────────

interface DoctorFormModalProps {
  doctor?: Doctor | null;
  onClose: () => void;
  onSaved: () => void;
}

function DoctorFormModal({ doctor, onClose, onSaved }: DoctorFormModalProps) {
  const isEditing = !!doctor;
  const [serverError, setServerError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DoctorFormInput>({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: {
      email: doctor?.user?.email ?? "",
      password: "",
      firstName: doctor?.user?.firstName ?? "",
      lastName: doctor?.user?.lastName ?? "",
      phone: doctor?.user?.phone ?? "",
      departmentId: doctor?.departmentId ?? "",
      specialization: doctor?.specialization ?? "",
      bio: doctor?.bio ?? "",
      licenseNumber: doctor?.licenseNumber ?? "",
    },
  });

  useEffect(() => {
    departmentsApi.listDepartments({ limit: 100 }).then((res) => {
      setDepartments(res.data.filter((d) => d.isActive));
    });
  }, []);

  const onSubmit = async (data: DoctorFormInput) => {
    setServerError(null);
    try {
      if (isEditing && doctor) {
        // For editing, we don't send email/password/licenseNumber as per our API (currently)
        await doctorsApi.updateDoctor(doctor.id, {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          departmentId: data.departmentId,
          specialization: data.specialization,
          bio: data.bio || null,
        });
      } else {
        if (!data.password) {
          setServerError("Password is required for new doctors");
          return;
        }
        await doctorsApi.createDoctor({
          ...data,
          password: data.password,
          phone: data.phone || null,
          bio: data.bio || null,
        } as any);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: {
          data?: {
            message?: string;
            errors?: any;
            error?: {
              issues?: Array<{ path: string[]; message: string }>;
            };
          };
        };
      };
      const data = axiosError.response?.data;
      if (data?.message) {
        setServerError(data.message);
      } else if (data?.error?.issues) {
        // Flatten Hono/Zod-OpenAPI issues
        const errorMsgs = data.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(" | ");
        setServerError(errorMsgs || "Validation failed");
      } else if (data?.errors) {
        // Flatten other potential error structures
        const errorMsgs = Object.entries(data.errors)
          .map(([field, error]: [string, any]) => `${field}: ${error._errors?.join(", ") || error}`)
          .join(" | ");
        setServerError(errorMsgs || "Validation failed");
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }

  };

  return (
    <div
      data-testid="doctor-form-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-10"
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg my-auto">
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">
          {isEditing ? "Edit Doctor" : "Create Doctor"}
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          {serverError && (
            <p
              role="alert"
              data-testid="doctor-form-error"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {serverError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="doc-firstName" className="text-sm font-medium">
                First Name <span className="text-destructive">*</span>
              </label>
              <input
                id="doc-firstName"
                type="text"
                data-testid="doctor-firstName-input"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="doc-lastName" className="text-sm font-medium">
                Last Name <span className="text-destructive">*</span>
              </label>
              <input
                id="doc-lastName"
                type="text"
                data-testid="doctor-lastName-input"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="doc-email" className="text-sm font-medium">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              id="doc-email"
              type="email"
              disabled={isEditing}
              data-testid="doctor-email-input"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-1">
              <label htmlFor="doc-password" className="text-sm font-medium">
                Password <span className="text-destructive">*</span>
              </label>
              <input
                id="doc-password"
                type="password"
                data-testid="doctor-password-input"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="doc-phone" className="text-sm font-medium">
              Phone
            </label>
            <input
              id="doc-phone"
              type="text"
              data-testid="doctor-phone-input"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register("phone")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="doc-department" className="text-sm font-medium">
                Department <span className="text-destructive">*</span>
              </label>
              <select
                id="doc-department"
                data-testid="doctor-department-input"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                {...register("departmentId")}
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {errors.departmentId && (
                <p className="text-xs text-destructive">
                  {errors.departmentId.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="doc-license" className="text-sm font-medium">
                License Number <span className="text-destructive">*</span>
              </label>
              <input
                id="doc-license"
                type="text"
                disabled={isEditing}
                data-testid="doctor-license-input"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                {...register("licenseNumber")}
              />
              {errors.licenseNumber && (
                <p className="text-xs text-destructive">
                  {errors.licenseNumber.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="doc-specialization" className="text-sm font-medium">
              Specialization <span className="text-destructive">*</span>
            </label>
            <input
              id="doc-specialization"
              type="text"
              data-testid="doctor-specialization-input"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register("specialization")}
            />
            {errors.specialization && (
              <p className="text-xs text-destructive">
                {errors.specialization.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="doc-bio" className="text-sm font-medium">
              Bio
            </label>
            <textarea
              id="doc-bio"
              data-testid="doctor-bio-input"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register("bio")}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              data-testid="doctor-form-cancel"
              onClick={onClose}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="doctor-form-submit"
              disabled={isSubmitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : isEditing ? "Save changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Doctor Card ───────────────────────────────────────────────────────────────

interface DoctorCardProps {
  doctor: Doctor;
  isAdmin: boolean;
  onEdit: (doctor: Doctor) => void;
  onDelete: (id: string) => void;
}

function DoctorCard({ doctor, isAdmin, onEdit, onDelete }: DoctorCardProps) {
  const fullName = `Dr. ${doctor.user?.firstName} ${doctor.user?.lastName}`;

  return (
    <div
      data-testid={`doctor-card-${doctor.id}`}
      className="rounded-lg border border-border bg-card shadow-sm overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
            {doctor.user?.avatarUrl ? (
              <img
                src={doctor.user.avatarUrl}
                alt={fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl">
                👨‍⚕️
              </div>
            )}
          </div>
          <div className="min-w-0">
            <Link
              to={`/doctors/${doctor.id}`}
              className="hover:underline"
              data-testid={`doctor-link-${doctor.id}`}
            >
              <h3 className="font-semibold text-card-foreground truncate">
                {fullName}
              </h3>
            </Link>
            <p className="text-sm text-primary font-medium">
              {doctor.specialization}
            </p>
            <p className="text-xs text-muted-foreground">
              {doctor.department?.name}
            </p>
          </div>
        </div>

        {doctor.bio && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2 italic">
            "{doctor.bio}"
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            License: <span className="font-mono">{doctor.licenseNumber}</span>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-4 flex gap-2 border-t pt-3">
            <button
              data-testid={`edit-doctor-${doctor.id}`}
              onClick={() => onEdit(doctor)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Edit
            </button>
            <button
              data-testid={`delete-doctor-${doctor.id}`}
              onClick={() => onDelete(doctor.id)}
              className="flex-1 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DoctorsPage ───────────────────────────────────────────────────────────────

export function DoctorsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await doctorsApi.listDoctors({ search: search || undefined });
      setDoctors(res.data);
    } catch {
      setError("Failed to load doctors. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this doctor? This will also delete their user account."
      )
    ) {
      return;
    }
    try {
      await doctorsApi.deleteDoctor(id);
      fetchDoctors();
    } catch {
      alert("Failed to delete doctor.");
    }
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingDoctor(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingDoctor(null);
  };

  return (
    <div data-testid="doctors-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Doctors</h1>
          <p className="text-sm text-muted-foreground">
            Find and manage our healthcare professionals
          </p>
        </div>
        {isAdmin && (
          <button
            data-testid="create-doctor-button"
            onClick={handleCreate}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Create Doctor
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          data-testid="doctors-search"
          placeholder="Search doctors by name or specialization…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* States */}
      {loading && (
        <div
          data-testid="doctors-loading"
          className="py-12 text-center text-muted-foreground"
        >
          Loading doctors…
        </div>
      )}

      {error && !loading && (
        <div
          data-testid="doctors-error"
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {!loading && !error && doctors.length === 0 && (
        <div
          data-testid="doctors-empty"
          className="py-12 text-center text-muted-foreground"
        >
          No doctors found.
        </div>
      )}

      {/* Doctor cards */}
      {!loading && !error && doctors.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {doctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <DoctorFormModal
          doctor={editingDoctor}
          onClose={handleModalClose}
          onSaved={fetchDoctors}
        />
      )}
    </div>
  );
}
