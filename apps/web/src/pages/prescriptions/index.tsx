import { useLoaderData, Link } from "react-router";
import { prescriptionsApi } from "@/lib/api-client";
import type { PrescriptionResponse } from "@caresync/shared";

export async function prescriptionsLoader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? 1);
  const limit = Number(url.searchParams.get("limit") ?? 10);
  return prescriptionsApi.list({ page, limit });
}

export function PrescriptionsPage() {
  const data = useLoaderData() as {
    data: PrescriptionResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  const prescriptions = data.data;
  const { page, limit, total, totalPages } = data;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Prescriptions</h1>
        <p className="text-sm text-muted-foreground">
          View your prescriptions and medication history
        </p>
      </div>

      {prescriptions.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No prescriptions found.
        </div>
      )}

      {prescriptions.length > 0 && (
        <>
          <div className="space-y-3">
            {prescriptions.map((rx) => (
              <Link
                key={rx.id}
                to={`/prescriptions/${rx.id}`}
                className="block rounded-lg border border-border bg-card p-4 shadow-sm hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">
                      {rx.items.length} medication
                      {rx.items.length !== 1 ? "s" : ""}
                    </p>
                    {rx.notes && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                        {rx.notes}
                      </p>
                    )}
                    {rx.medicalRecord && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {rx.medicalRecord.diagnosis} ·{" "}
                        {rx.medicalRecord.appointmentDate}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm text-muted-foreground">
                      {new Date(rx.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {rx.medicalRecord?.type ?? "consultation"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  to={`/prescriptions?page=${page - 1}&limit=${limit}`}
                  className="rounded-md border border-border px-3 py-1 text-sm hover:bg-accent"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </span>
              {page < totalPages && (
                <Link
                  to={`/prescriptions?page=${page + 1}&limit=${limit}`}
                  className="rounded-md border border-border px-3 py-1 text-sm hover:bg-accent"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
