import { Link, redirect } from "react-router";
import { CalendarPlus, FileText, Receipt, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { appointmentsApi, medicalRecordsApi, invoicesApi } from "@/lib/api-client";
import type { Route } from "./dashboard.loader";
import type { AppointmentListItem } from "@/lib/api-client";
import { useLoaderData } from "react-router";

export async function dashboardLoader() {
  const user = useAuthStore.getState().user;
  if (!user) {
    throw redirect("/login");
  }

  const [appointmentsData, medicalRecordsData, invoicesData] = await Promise.all(
    [
      appointmentsApi.list({ limit: 5 }),
      medicalRecordsApi.list(),
      invoicesApi.listInvoices({ limit: 5 }),
    ]
  );

  return {
    appointments: appointmentsData.data,
    medicalRecords: medicalRecordsData.slice(0, 5),
    invoices: invoicesData.data.slice(0, 5),
  };
}

export function DashboardPage() {
  const { appointments, medicalRecords, invoices } = useLoaderData<Route>() as {
    appointments: AppointmentListItem[];
    medicalRecords: Array<{
      id: string;
      diagnosis: string;
      createdAt: string;
    }>;
    invoices: Array<{
      id: string;
      amount: number;
      status: string;
      dueDate: string;
    }>;
  };

  const upcomingAppointments = appointments.filter(
    (a) => a.status === "pending" || a.status === "confirmed"
  );

  return (
    <div data-testid="dashboard-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to CareSync — Healthcare Clinic Management System
        </p>
      </div>

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

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Upcoming Appointments
            </h2>
            <Link
              to="/appointments"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          {upcomingAppointments.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No upcoming appointments
              </p>
              <Link
                to="/appointments/book"
                className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
              >
                Book now
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  to={`/appointments/${appointment.id}`}
                  className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
                >
                  <p className="font-medium text-card-foreground">
                    {appointment.doctorName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.appointmentDate} at {appointment.startTime}
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                    {appointment.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Recent Medical Records
            </h2>
            <Link
              to="/medical-records"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          {medicalRecords.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No medical records</p>
            </div>
          ) : (
            <div className="space-y-3">
              {medicalRecords.map((record) => (
                <Link
                  key={record.id}
                  to={`/medical-records/${record.id}`}
                  className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
                >
                  <p className="font-medium text-card-foreground">
                    {record.diagnosis}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Recent Invoices
            </h2>
            <Link
              to="/invoices"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          {invoices.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <Receipt className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No invoices</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  to={`/invoices/${invoice.id}`}
                  className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-card-foreground">
                      Rp {invoice.amount.toLocaleString("id-ID")}
                    </p>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        invoice.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : invoice.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Due: {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
