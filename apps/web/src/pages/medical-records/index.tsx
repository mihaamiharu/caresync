import { useLoaderData, useNavigation, Link } from "react-router";
import { medicalRecordsApi } from "@/lib/api-client";
import type { MedicalRecord } from "@caresync/shared";

// ─── Loader ────────────────────────────────────────────────────────────────────

export async function medicalRecordsLoader() {
  return medicalRecordsApi.list();
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function MedicalRecordsPage() {
  const records = useLoaderData() as MedicalRecord[];
  const navigation = useNavigation();
  const loading = navigation.state === "loading";

  return (
    <div data-testid="medical-records-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Medical Records</h1>
        <p className="text-sm text-muted-foreground">
          View your medical history and diagnoses
        </p>
      </div>

      {loading && (
        <div
          data-testid="medical-records-loading"
          className="py-12 text-center text-sm text-muted-foreground"
        >
          Loading…
        </div>
      )}

      {!loading && records.length === 0 && (
        <div
          data-testid="medical-records-empty"
          className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground"
        >
          No medical records found.
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="space-y-3">
          {records.map((record) => (
            <Link
              key={record.id}
              to={`/medical-records/${record.id}`}
              data-testid={`medical-record-card-${record.id}`}
              className="block rounded-lg border border-border bg-card p-4 shadow-sm hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p
                    data-testid={`record-diagnosis-${record.id}`}
                    className="font-semibold text-foreground truncate"
                  >
                    {record.diagnosis}
                  </p>
                  {record.doctor && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Dr. {record.doctor.user.firstName}{" "}
                      {record.doctor.user.lastName}
                      {" · "}
                      {record.doctor.specialization}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {record.appointment && (
                    <p className="text-sm text-muted-foreground">
                      {record.appointment.appointmentDate}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {record.symptoms && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
                  Symptoms: {record.symptoms}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
