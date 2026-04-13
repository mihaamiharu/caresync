import { Link } from "react-router";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isPatient = user?.role === "patient";

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
          {
            label: "Appointments Today",
            value: "—",
            testId: "stat-appointments",
          },
          { label: "Revenue (Month)", value: "—", testId: "stat-revenue" },
        ].map(({ label, value, testId }) => (
          <div
            key={testId}
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
            data-testid={testId}
          >
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-card-foreground">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Patient booking CTA */}
      {isPatient && (
        <div
          className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-6"
          data-testid="book-appointment-cta"
        >
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">
                Ready for your next visit?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Book an appointment with one of our doctors in just a few steps.
              </p>
            </div>
            <Link
              to="/appointments/book"
              data-testid="dashboard-book-appointment-link"
              className="flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <CalendarPlus className="h-4 w-4" />
              Book Appointment
            </Link>
          </div>
        </div>
      )}

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
