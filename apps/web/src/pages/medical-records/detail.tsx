import { useRef, useState } from "react";
import { useLoaderData, Link, useRevalidator } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { toast } from "sonner";
import { medicalRecordsApi } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { MedicalRecord, MedicalRecordAttachment } from "@caresync/shared";

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
      } catch (err: unknown) {
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export function MedicalRecordDetailPage() {
  const record = useLoaderData() as MedicalRecord;
  const revalidator = useRevalidator();
  const role = useAuthStore((s) => s.user?.role ?? "");

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
    </div>
  );
}
