import { Link, redirect } from "react-router";
import { CalendarPlus, FileText, Receipt, Calendar, ArrowRight, Activity, Users, Clock } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { appointmentsApi, medicalRecordsApi, invoicesApi } from "@/lib/api-client";
import type { Route } from "./dashboard.loader";
import type { AppointmentListItem } from "@/lib/api-client";
import { useLoaderData } from "react-router";
import { cn } from "@/lib/utils";

export async function dashboardLoader() {
  const user = useAuthStore.getState().user;
  if (!user) {
    throw redirect("/login");
  }

  const [appointmentsData, medicalRecordsData, invoicesData] = await Promise.all(
    [
      appointmentsApi.list({ limit: 10 }),
      medicalRecordsApi.list(),
      invoicesApi.listInvoices({ limit: 10 }),
    ]
  );

  return {
    appointments: appointmentsData.data,
    medicalRecords: medicalRecordsData.slice(0, 5),
    invoices: invoicesData.data.slice(0, 5),
  };
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
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

  const stats = [
    {
      label: "Appointments",
      value: upcomingAppointments.length.toString(),
      description: "Upcoming visits",
      icon: Calendar,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Medical Records",
      value: medicalRecords.length.toString(),
      description: "Total entries",
      icon: FileText,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Pending Bills",
      value: invoices.filter(i => i.status !== 'paid').length.toString(),
      description: "To be settled",
      icon: Receipt,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  return (
    <div data-testid="dashboard-page" className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your health profile today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <h3 className="mt-1 text-2xl font-bold text-foreground">{stat.value}</h3>
              </div>
              <div className={cn("rounded-xl p-3 transition-colors", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3 text-emerald-500" />
              {stat.description}
            </p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column: Appointments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Upcoming Visits
            </h2>
            <Link
              to="/appointments"
              className="group flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No upcoming appointments found</p>
                <Link
                  to="/appointments/book"
                  className="mt-4 text-sm font-semibold text-primary hover:text-primary/80"
                >
                  Book your first visit
                </Link>
              </div>
            ) : (
              upcomingAppointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  to={`/appointments/${appointment.id}`}
                  className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {appointment.doctorName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.appointmentDate} • {appointment.startTime}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {appointment.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions & Invoices */}
        <div className="space-y-8">
          {/* Quick Action Card */}
          <div className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-lg shadow-primary/20 relative overflow-hidden group">
            <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors" />
            <div className="relative z-10">
              <h2 className="text-xl font-bold">Health checkup?</h2>
              <p className="mt-1 text-primary-foreground/80 text-sm">
                Book an appointment with our specialists in just a few clicks.
              </p>
              <Link
                to="/appointments/book"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary transition-transform hover:scale-105 active:scale-95"
              >
                <CalendarPlus className="h-4 w-4" />
                Book Now
              </Link>
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Recent Invoices</h2>
              <Link
                to="/invoices"
                className="text-sm font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent invoices</p>
              ) : (
                invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    to={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        Rp {invoice.amount.toLocaleString("id-ID")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Due {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                        invoice.status === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-orange-100 text-orange-700"
                      )}
                    >
                      {invoice.status}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
