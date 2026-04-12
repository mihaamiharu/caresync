import { useState, useEffect, useCallback } from "react";
import { patientsApi } from "@/lib/api-client";
import { BLOOD_TYPES, GENDERS } from "@caresync/shared";
import type { Patient } from "@caresync/shared";

export function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [loading, setLoading] = useState(true);

  const LIMIT = 20;

  const fetchPatients = useCallback(
    async (params: {
      page: number;
      search: string;
      gender: string;
      bloodType: string;
    }) => {
      setLoading(true);
      try {
        const res = await patientsApi.listPatients({
          page: params.page,
          limit: LIMIT,
          search: params.search || undefined,
          gender: params.gender || undefined,
          bloodType: params.bloodType || undefined,
        });
        setPatients(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPatients({ page, search, gender, bloodType });
  }, [fetchPatients, page, search, gender, bloodType]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGender(e.target.value);
    setPage(1);
  };

  const handleBloodTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBloodType(e.target.value);
    setPage(1);
  };

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
          onChange={handleSearchChange}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
        />

        <select
          data-testid="gender-filter"
          value={gender}
          onChange={handleGenderChange}
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
          onChange={handleBloodTypeChange}
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
            {!loading && patients.length === 0 && (
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
            {patients.map((patient) => (
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-input px-3 py-1 disabled:opacity-40 hover:bg-accent"
          >
            Previous
          </button>
          <span className="px-2 py-1">
            {page} / {totalPages || 1}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
