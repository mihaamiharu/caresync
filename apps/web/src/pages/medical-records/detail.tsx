import { useRef, useState } from "react";
import { useLoaderData, Link, useRevalidator } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import {
  useForm,
  useFieldArray,
  Controller,
  type Control,
} from "react-hook-form";
import { toast } from "sonner";
import { medicalRecordsApi, prescriptionsApi } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { MedicalRecord, MedicalRecordAttachment } from "@caresync/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ─── Loader ────────────────────────────────────────────────────────────────────

export async function medicalRecordDetailLoader({
  params,
}: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response("Not found", { status: 404 });
  return medicalRecordsApi.get(id);
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(fileType: string): string {
  if (fileType === "application/pdf") return "📄";
  if (fileType.startsWith("image/")) return "🖼️";
  return "📎";
}

// ─── AttachmentsCard ──────────────────────────────────────────────────────────

function AttachmentsCard({
  record,
  userRole,
  onUpload,
}: {
  record: MedicalRecord;
  userRole: string;
  onUpload: (file: File) => Promise<void>;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const attachments: MedicalRecordAttachment[] = record.attachments ?? [];
  const isDoctor = userRole === "doctor";

  async function processFiles(files: FileList) {
    setUploadError(null);
    for (const file of Array.from(files)) {
      try {
        await onUpload(file);
      } catch (err) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Upload failed";
        toast.error(msg);
        setUploadError(msg);
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }

  async function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
      e.target.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-base font-semibold text-foreground">
        Attachments
      </h2>

      {/* File list */}
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      ) : (
        <ul className="mb-4 divide-y divide-border">
          {attachments.map((att) => (
            <li key={att.id} className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-sm text-foreground">
                <span aria-hidden="true">{fileIcon(att.fileType)}</span>
                <span>{att.fileName}</span>
                <span className="text-muted-foreground">
                  ({formatBytes(att.fileSize)})
                </span>
              </span>
              <a
                href={`/api/v1/medical-records/${record.id}/attachments/${att.id}/download`}
                className="text-sm text-primary hover:underline"
                download={att.fileName}
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* Upload zone — doctor only */}
      {isDoctor && (
        <>
          <div
            data-testid="upload-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
              dragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <p className="text-sm text-muted-foreground">
              Drag & drop files here, or{" "}
              <span className="text-primary">browse</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, JPG, PNG — max 10 MB
            </p>
            <input
              ref={inputRef}
              data-testid="file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
          {uploadError && (
            <p
              data-testid="upload-error"
              className="mt-2 text-sm text-destructive"
            >
              {uploadError}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── PrescriptionModal ────────────────────────────────────────────────────────

interface MedicationItem {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PrescriptionFormData {
  notes?: string;
  items: MedicationItem[];
}

function PrescriptionModal({
  medicalRecordId,
  open,
  onOpenChange,
  onSuccess,
}: {
  medicalRecordId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PrescriptionFormData>({
    defaultValues: {
      notes: "",
      items: [
        {
          medicationName: "",
          dosage: "",
          frequency: "",
          duration: "",
          instructions: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  async function onSubmit(data: PrescriptionFormData) {
    setSubmitting(true);
    try {
      await prescriptionsApi.create({
        medicalRecordId,
        notes: data.notes || null,
        items: data.items.map((item) => ({
          medicationName: item.medicationName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions || null,
        })),
      });
      toast.success("Prescription created successfully");
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create prescription";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Prescription</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              {...register("notes")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Medications</label>
              <button
                type="button"
                onClick={() =>
                  append({
                    medicationName: "",
                    dosage: "",
                    frequency: "",
                    duration: "",
                    instructions: "",
                  })
                }
                className="text-sm text-primary hover:underline"
              >
                + Add medication
              </button>
            </div>

            {errors.items?.root && (
              <p className="text-sm text-destructive mb-2">
                {errors.items.root.message}
              </p>
            )}

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-6 gap-2 rounded-lg border border-border p-3"
                >
                  <div className="col-span-2">
                    <input
                      {...register(`items.${index}.medicationName`, {
                        required: "Required",
                      })}
                      placeholder="Medication name"
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    />
                    {errors.items?.[index]?.medicationName && (
                      <p className="text-xs text-destructive mt-0.5">
                        Required
                      </p>
                    )}
                  </div>
                  <div className="col-span-1">
                    <input
                      {...register(`items.${index}.dosage`, {
                        required: "Required",
                      })}
                      placeholder="Dosage"
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    />
                    {errors.items?.[index]?.dosage && (
                      <p className="text-xs text-destructive mt-0.5">
                        Required
                      </p>
                    )}
                  </div>
                  <div className="col-span-1">
                    <input
                      {...register(`items.${index}.frequency`, {
                        required: "Required",
                      })}
                      placeholder="Frequency"
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    />
                    {errors.items?.[index]?.frequency && (
                      <p className="text-xs text-destructive mt-0.5">
                        Required
                      </p>
                    )}
                  </div>
                  <div className="col-span-1">
                    <input
                      {...register(`items.${index}.duration`, {
                        required: "Required",
                      })}
                      placeholder="Duration"
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    />
                    {errors.items?.[index]?.duration && (
                      <p className="text-xs text-destructive mt-0.5">
                        Required
                      </p>
                    )}
                  </div>
                  <div className="col-span-1 flex items-start">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="mt-1.5 text-sm text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="col-span-6">
                    <input
                      {...register(`items.${index}.instructions`)}
                      placeholder="Instructions (optional)"
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Prescription"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── PrescriptionCard ─────────────────────────────────────────────────────────

function PrescriptionCard({
  prescription,
  medicalRecordId,
  appointmentStatus,
  userRole,
  onAddClick,
}: {
  prescription?: {
    id: string;
    notes: string | null;
    items?: { id: string }[];
  } | null;
  medicalRecordId: string;
  appointmentStatus?: string;
  userRole: string;
  onAddClick: () => void;
}) {
  const isDoctor = userRole === "doctor";
  const eligibleStatuses = ["confirmed", "in-progress", "completed"];
  const canAdd =
    isDoctor &&
    appointmentStatus &&
    eligibleStatuses.includes(appointmentStatus) &&
    !prescription;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-base font-semibold text-foreground">
        Prescription
      </h2>

      {prescription ? (
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            {prescription.items?.length ?? 0} medication
            {(prescription.items?.length ?? 0) !== 1 ? "s" : ""}
          </p>
          {prescription.notes && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {prescription.notes}
            </p>
          )}
          <Link
            to={`/prescriptions/${prescription.id}`}
            className="text-sm text-primary hover:underline"
          >
            View Prescription →
          </Link>
        </div>
      ) : canAdd ? (
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            No prescription for this medical record yet.
          </p>
          <button
            onClick={onAddClick}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Add Prescription
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No prescription for this medical record.
        </p>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function MedicalRecordDetailPage() {
  const record = useLoaderData() as MedicalRecord;
  const revalidator = useRevalidator();
  const role = useAuthStore((s) => s.user?.role ?? "");
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);

  const doctorName = record.doctor
    ? `Dr. ${record.doctor.user.firstName} ${record.doctor.user.lastName}`
    : "—";

  async function handleUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    await medicalRecordsApi.uploadAttachment(record.id, formData);
    revalidator.revalidate();
  }

  return (
    <div data-testid="medical-record-detail-page">
      <div className="mb-6">
        <Link
          to="/medical-records"
          data-testid="back-to-records"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Medical Records
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Medical Record</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Diagnosis & Notes */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Diagnosis
          </h2>
          <dl>
            <DetailRow
              label="Diagnosis"
              value={
                <span data-testid="record-diagnosis">{record.diagnosis}</span>
              }
            />
            <DetailRow
              label="Symptoms"
              value={
                record.symptoms ? (
                  <span data-testid="record-symptoms">{record.symptoms}</span>
                ) : null
              }
            />
            <DetailRow
              label="Notes"
              value={
                record.notes ? (
                  <span data-testid="record-notes">{record.notes}</span>
                ) : null
              }
            />
            <DetailRow
              label="Created"
              value={new Date(record.createdAt).toLocaleString()}
            />
          </dl>
        </div>

        {/* Appointment info */}
        {record.appointment && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-base font-semibold text-foreground">
              Appointment
            </h2>
            <dl>
              <DetailRow
                label="Date"
                value={record.appointment.appointmentDate}
              />
              <DetailRow label="Time" value={record.appointment.startTime} />
              <DetailRow
                label="Type"
                value={
                  <span className="capitalize">{record.appointment.type}</span>
                }
              />
              <DetailRow
                label="Status"
                value={
                  <span className="capitalize">
                    {record.appointment.status}
                  </span>
                }
              />
              <DetailRow
                label="Appointment"
                value={
                  <Link
                    to={`/appointments/${record.appointmentId}`}
                    className="text-primary hover:underline"
                    data-testid="link-to-appointment"
                  >
                    View appointment
                  </Link>
                }
              />
            </dl>
          </div>
        )}

        {/* Doctor info */}
        {record.doctor && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-base font-semibold text-foreground">
              Doctor
            </h2>
            <dl>
              <DetailRow label="Name" value={doctorName} />
              <DetailRow
                label="Specialization"
                value={record.doctor.specialization}
              />
            </dl>
          </div>
        )}
      </div>

      {/* Attachments — full width */}
      <div className="mt-6">
        <AttachmentsCard
          record={record}
          userRole={role}
          onUpload={handleUpload}
        />
      </div>

      {/* Prescription */}
      <div className="mt-6">
        <PrescriptionCard
          prescription={record.prescription}
          medicalRecordId={record.id}
          appointmentStatus={record.appointment?.status}
          userRole={role}
          onAddClick={() => setPrescriptionModalOpen(true)}
        />
      </div>

      <PrescriptionModal
        medicalRecordId={record.id}
        open={prescriptionModalOpen}
        onOpenChange={setPrescriptionModalOpen}
        onSuccess={() => revalidator.revalidate()}
      />
    </div>
  );
}
