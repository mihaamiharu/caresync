import { Button } from "@/components/ui/button";

export function DashboardPage() {
  return (
    <div data-testid="dashboard-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to CareSync — Healthcare Clinic Management System
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Patients", value: "—", testId: "stat-patients" },
          { label: "Total Doctors", value: "—", testId: "stat-doctors" },
          { label: "Appointments Today", value: "—", testId: "stat-appointments" },
          { label: "Revenue (Month)", value: "—", testId: "stat-revenue" },
        ].map(({ label, value, testId }) => (
          <div
            key={testId}
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
            data-testid={testId}
          >
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-card-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder CTA */}
      <div className="mt-8 rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-muted-foreground">
          Full dashboard charts and stats will be available in Task 22.
        </p>
        <Button className="mt-4" data-testid="dashboard-cta">
          Get Started
        </Button>
      </div>
    </div>
  );
}
