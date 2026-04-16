import { useLoaderData, Link } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { useState, useCallback } from "react";
import { medicalRecordsApi } from "@/lib/api-client";
import { attachmentsApi } from "@/lib/attachments-api";
import type { MedicalRecord, MedicalRecordAttachment } from "@caresync/shared";
import { AttachmentList, FileUpload } from "@/components/attachments";

// ─── Loader ────────────────────────────────────────────────────────────────────

export async function medicalRecordDetailLoader({
  params,
}: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response("Not found", { status: 404 });
  const record = await medicalRecordsApi.get(id);
  const attachments = await attachmentsApi.list(id);
  return { record, attachments };
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export function MedicalRecordDetailPage() {
  const { record, attachments: initialAttachments } = useLoaderData() as {
    record: MedicalRecord;
    attachments: MedicalRecordAttachment[];
  };
  const [attachments, setAttachments] = useState(initialAttachments);

  const doctorName = record.doctor
    ? `Dr. ${record.doctor.user.firstName} ${record.doctor.user.lastName}`
    : "—";

  const handleUpload = useCallback(
    async (file: File) => {
      await attachmentsApi.upload(record.id, file);
      // Refresh attachments list
      const updated = await attachmentsApi.list(record.id);
      setAttachments(updated);
    },
    [record.id]
  );

  const handleDelete = useCallback(async (attachmentId: string) => {
    await attachmentsApi.delete(attachmentId);
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  }, []);

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

        {/* Attachments */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Attachments
          </h2>
          <div className="space-y-4">
            <FileUpload
              onUpload={handleUpload}
              accept="image/*,.pdf,.doc,.docx,.txt"
              maxSizeMB={10}
            />
            <AttachmentList attachments={attachments} onDelete={handleDelete} />
          </div>
        </div>
      </div>
    </div>
  );
}
