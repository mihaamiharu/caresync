import { useLoaderData, useNavigation, useSearchParams } from "react-router";
import { patientsApi } from "@/lib/api-client";
import { BLOOD_TYPES, GENDERS } from "@caresync/shared";
import type { Patient } from "@caresync/shared";

// ─── Loader ────────────────────────────────────────────────────────────────────

export async function patientsLoader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const search = url.searchParams.get("search") ?? "";
  const gender = url.searchParams.get("gender") ?? "";
  const bloodType = url.searchParams.get("bloodType") ?? "";
  return patientsApi.listPatients({
    page,
    limit: 20,
    search: search || undefined,
    gender: gender || undefined,
    bloodType: bloodType || undefined,
  });
}

export function PatientsPage() {
  const {
    data: patients,
    total,
    page,
    totalPages,
  } = useLoaderData() as {
    data: Patient[];
    total: number;
    page: number;
    totalPages: number;
  };
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const gender = searchParams.get("gender") ?? "";
  const bloodType = searchParams.get("bloodType") ?? "";

  const LIMIT = 20;
  const isLoading = navigation.state !== "idle";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  }

  return (
    <div data-testid="patients-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Patients</h1>
        <p className="text-sm text-muted-foreground">
          Manage patient profiles and medical information
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          data-testid="search-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setParam("search", e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
        />

        <select
          data-testid="gender-filter"
          value={gender}
          onChange={(e) => setParam("gender", e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All genders</option>
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </option>
          ))}
        </select>

        <select
          data-testid="blood-type-filter"
          value={bloodType}
          onChange={(e) => setParam("bloodType", e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All blood types</option>
          {BLOOD_TYPES.map((bt) => (
            <option key={bt} value={bt}>
              {bt}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Email
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Date of Birth
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Gender
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Blood Type
              </th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && patients.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  data-testid="patients-empty"
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No patients found.
                </td>
              </tr>
            )}
            {!isLoading &&
              patients.map((patient) => (
                <tr
                  key={patient.id}
                  data-testid={`patient-row-${patient.id}`}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {patient.user?.firstName} {patient.user?.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {patient.user?.email}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {patient.dateOfBirth ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {patient.gender ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {patient.bloodType ?? "—"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        data-testid="pagination-info"
        className="mt-4 flex items-center justify-between text-sm text-muted-foreground"
      >
        <span>
          {total === 0
            ? "No patients"
            : `Showing ${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} of ${total}`}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setParam("page", String(Math.max(1, page - 1)))}
            disabled={page <= 1}
            className="rounded-md border border-input px-3 py-1 disabled:opacity-40 hover:bg-accent"
          >
            Previous
          </button>
          <span className="px-2 py-1">
            {page} / {totalPages || 1}
          </span>
          <button
            onClick={() =>
              setParam("page", String(Math.min(totalPages, page + 1)))
            }
            disabled={page >= totalPages}
            className="rounded-md border border-input px-3 py-1 disabled:opacity-40 hover:bg-accent"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
