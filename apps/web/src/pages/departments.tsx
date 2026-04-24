import { useState } from "react";
import { useLoaderData, useNavigation, useRevalidator } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { departmentsApi } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { Department } from "@caresync/shared";
import { Plus, Search, Edit2, Trash2, Stethoscope, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
    const payload = {
      name: data.name,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
    };
    try {
      if (isEditing && dept) {
        await departmentsApi.updateDepartment(dept.id, payload);
        toast.success("Department updated successfully");
      } else {
        await departmentsApi.createDepartment(payload);
        toast.success("Department created successfully");
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg ?? "Something went wrong. Please try again.");
    }
  };

  return (
    <div
      data-testid="department-form-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            {isEditing ? "Edit Department" : "Create New Department"}
          </h2>
          <p className="text-muted-foreground mt-1">
            Fill in the details below to manage clinic departments.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-6"
        >
          <div className="space-y-2">
            <label htmlFor="dept-name" className="text-sm font-semibold text-foreground ml-1">
              Department Name
            </label>
            <input
              id="dept-name"
              type="text"
              placeholder="e.g. Cardiology"
              data-testid="dept-name-input"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs font-medium text-destructive ml-1" data-testid="dept-name-error">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="dept-description" className="text-sm font-semibold text-foreground ml-1">
              Description
            </label>
            <textarea
              id="dept-description"
              placeholder="What does this department specialize in?"
              data-testid="dept-description-input"
              rows={4}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="dept-imageUrl" className="text-sm font-semibold text-foreground ml-1">
              Cover Image URL
            </label>
            <div className="relative">
              <input
                id="dept-imageUrl"
                type="text"
                placeholder="https://images.unsplash.com/..."
                data-testid="dept-imageurl-input"
                className="w-full rounded-2xl border border-border bg-background pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                {...register("imageUrl")}
              />
              <ImageIcon className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
            </div>
            {errors.imageUrl && (
              <p className="text-xs font-medium text-destructive ml-1" data-testid="dept-imageurl-error">
                {errors.imageUrl.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-background px-6 py-2.5 text-sm font-bold text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/20"
            >
              {isSubmitting ? "Processing..." : isEditing ? "Save Changes" : "Create Department"}
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
      className="group rounded-3xl border border-border bg-card shadow-sm overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1"
    >
      <div className="relative h-48 w-full overflow-hidden">
        {dept.imageUrl ? (
          <img
            src={dept.imageUrl}
            alt={dept.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            data-testid={`department-image-${dept.id}`}
          />
        ) : (
          <div
            className="flex h-full items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20"
            data-testid={`department-placeholder-${dept.id}`}
          >
            <Stethoscope className="h-12 w-12 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {!dept.isActive && (
          <div className="absolute top-4 right-4 rounded-full bg-background/90 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm">
            Inactive
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-foreground truncate group-hover:text-primary transition-colors">
          {dept.name}
        </h3>
        {dept.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {dept.description}
          </p>
        )}

        {isAdmin && (
          <div className="mt-6 flex items-center gap-2 border-t border-border pt-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
            <button
              data-testid={`edit-department-${dept.id}`}
              onClick={() => onEdit(dept)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              data-testid={`delete-department-${dept.id}`}
              onClick={() => onDelete(dept.id)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all"
            >
              <Trash2 className="h-4 w-4" />
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
    if (!confirm("Are you sure you want to delete this department?")) return;
    try {
      await departmentsApi.deleteDepartment(id);
      toast.success("Department removed");
      revalidator.revalidate();
    } catch {
      toast.error("Could not delete department");
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
    <div data-testid="departments-page" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Departments</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Specialized medical care units at CareSync.
          </p>
        </div>
        {isAdmin && (
          <button
            data-testid="create-department-button"
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl active:scale-95"
          >
            <Plus className="h-5 w-5" />
            New Department
          </button>
        )}
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            data-testid="departments-search"
            placeholder="Search specialized units..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-muted/30 text-muted-foreground text-sm font-medium">
          <Stethoscope className="h-4 w-4" />
          {filtered.length} Units Available
        </div>
      </div>

      {/* States */}
      {isLoading ? (
        <div data-testid="departments-loading" className="py-24 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
          <p className="mt-4 text-muted-foreground font-medium italic">Gathering data...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div data-testid="departments-empty" className="py-24 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
            <Search className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No matches found</h3>
          <p className="mt-2 text-muted-foreground">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
