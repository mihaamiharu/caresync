import { useState } from "react";
import { useLoaderData, useNavigation, useRevalidator } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { departmentsApi } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { Department } from "@caresync/shared";

// ─── Loader ────────────────────────────────────────────────────────────────────

export async function departmentsLoader(): Promise<Department[]> {
  const res = await departmentsApi.listDepartments();
  return res.data;
}

// ─── Form schema ───────────────────────────────────────────────────────────────

const departmentFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type DepartmentFormInput = z.infer<typeof departmentFormSchema>;

// ─── Department Form Modal ─────────────────────────────────────────────────────

interface DepartmentFormModalProps {
  dept?: Department | null;
  onClose: () => void;
  onSaved: () => void;
}

function DepartmentFormModal({
  dept,
  onClose,
  onSaved,
}: DepartmentFormModalProps) {
  const isEditing = !!dept;
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentFormInput>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: dept?.name ?? "",
      description: dept?.description ?? "",
      imageUrl: dept?.imageUrl ?? "",
    },
  });

  const onSubmit = async (data: DepartmentFormInput) => {
    setServerError(null);
    const payload = {
      name: data.name,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
    };
    try {
      if (isEditing && dept) {
        await departmentsApi.updateDepartment(dept.id, payload);
      } else {
        await departmentsApi.createDepartment(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setServerError(msg ?? "Something went wrong. Please try again.");
    }
  };

  return (
    <div
      data-testid="department-form-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">
          {isEditing ? "Edit Department" : "Create Department"}
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          {serverError && (
            <p
              role="alert"
              data-testid="dept-form-error"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {serverError}
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="dept-name" className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="dept-name"
              type="text"
              data-testid="dept-name-input"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register("name")}
            />
            {errors.name && (
              <p
                className="text-xs text-destructive"
                data-testid="dept-name-error"
              >
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="dept-description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="dept-description"
              data-testid="dept-description-input"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register("description")}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="dept-imageUrl" className="text-sm font-medium">
              Image URL
            </label>
            <input
              id="dept-imageUrl"
              type="text"
              data-testid="dept-imageurl-input"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register("imageUrl")}
            />
            {errors.imageUrl && (
              <p
                className="text-xs text-destructive"
                data-testid="dept-imageurl-error"
              >
                {errors.imageUrl.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              data-testid="dept-form-cancel"
              onClick={onClose}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="dept-form-submit"
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

// ─── Department Card ───────────────────────────────────────────────────────────

interface DepartmentCardProps {
  dept: Department;
  isAdmin: boolean;
  onEdit: (dept: Department) => void;
  onDelete: (id: string) => void;
}

function DepartmentCard({
  dept,
  isAdmin,
  onEdit,
  onDelete,
}: DepartmentCardProps) {
  return (
    <div
      data-testid={`department-card-${dept.id}`}
      className="rounded-lg border border-border bg-card shadow-sm overflow-hidden"
    >
      {dept.imageUrl ? (
        <img
          src={dept.imageUrl}
          alt={dept.name}
          className="h-36 w-full object-cover"
          data-testid={`department-image-${dept.id}`}
        />
      ) : (
        <div
          className="flex h-36 items-center justify-center bg-muted"
          data-testid={`department-placeholder-${dept.id}`}
        >
          <span className="text-4xl">🏥</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-card-foreground truncate">
              {dept.name}
            </h3>
            {dept.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {dept.description}
              </p>
            )}
          </div>
          {!dept.isActive && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Inactive
            </span>
          )}
        </div>

        {isAdmin && (
          <div className="mt-3 flex gap-2">
            <button
              data-testid={`edit-department-${dept.id}`}
              onClick={() => onEdit(dept)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Edit
            </button>
            <button
              data-testid={`delete-department-${dept.id}`}
              onClick={() => onDelete(dept.id)}
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DepartmentsPage ───────────────────────────────────────────────────────────

export function DepartmentsPage() {
  const departments = useLoaderData() as Department[];
  const navigation = useNavigation();
  const revalidator = useRevalidator();

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const isLoading = navigation.state !== "idle";

  const filtered = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      await departmentsApi.deleteDepartment(id);
      revalidator.revalidate();
    } catch {
      // Delete error is silent — a real app would show a toast
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingDept(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingDept(null);
  };

  return (
    <div data-testid="departments-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Departments</h1>
          <p className="text-sm text-muted-foreground">
            Browse all clinic departments
          </p>
        </div>
        {isAdmin && (
          <button
            data-testid="create-department-button"
            onClick={handleCreate}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Create Department
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          data-testid="departments-search"
          placeholder="Search departments…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* States */}
      {isLoading && (
        <div
          data-testid="departments-loading"
          className="py-12 text-center text-muted-foreground"
        >
          Loading departments…
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div
          data-testid="departments-empty"
          className="py-12 text-center text-muted-foreground"
        >
          No departments found.
        </div>
      )}

      {/* Department cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((dept) => (
            <DepartmentCard
              key={dept.id}
              dept={dept}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <DepartmentFormModal
          dept={editingDept}
          onClose={handleModalClose}
          onSaved={revalidator.revalidate}
        />
      )}
    </div>
  );
}
