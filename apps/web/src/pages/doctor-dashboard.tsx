import { Link, redirect } from "react-router";
import { Calendar, Users, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { doctorsApi, appointmentsApi } from "@/lib/api-client";
import type { Route } from "./doctor-dashboard.loader";
import type { DoctorMeStatsResponse } from "@caresync/shared";
import type { AppointmentListItem } from "@/lib/api-client";
import { useLoaderData } from "react-router";

export async function doctorDashboardLoader() {
  const user = useAuthStore.getState().user;
  if (!user || user.role !== "doctor") {
    throw redirect("/doctor");
  }

  const [doctorData, appointmentsData] = await Promise.all([
    doctorsApi.getDoctorMe(),
    appointmentsApi.list({ limit: 5 }),
  ]);

  return { doctorData, appointments: appointmentsData.data };
}

export function DoctorDashboardPage() {
  const { doctorData, appointments } = useLoaderData<Route>() as {
    doctorData: DoctorMeStatsResponse;
    appointments: AppointmentListItem[];
  };

  return (
    <div data-testid="doctor-dashboard-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome, Dr. {doctorData.user.firstName} {doctorData.user.lastName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {doctorData.department.name} — {doctorData.specialization}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          className="rounded-lg border border-border bg-card p-4 shadow-sm"
          data-testid="stat-today-appointments"
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Today's Appointments
              </p>
              <p className="mt-1 text-2xl font-bold text-card-foreground">
                {doctorData.stats.todayAppointments}
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-lg border border-border bg-card p-4 shadow-sm"
          data-testid="stat-total-patients"
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Patients
              </p>
              <p className="mt-1 text-2xl font-bold text-card-foreground">
                {doctorData.stats.uniquePatients}
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-lg border border-border bg-card p-4 shadow-sm"
          data-testid="stat-total-appointments"
        >
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Appointments
              </p>
              <p className="mt-1 text-2xl font-bold text-card-foreground">
                {doctorData.stats.totalAppointments}
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-lg border border-border bg-card p-4 shadow-sm"
          data-testid="stat-rating"
        >
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Average Rating
              </p>
              <p className="mt-1 text-2xl font-bold text-card-foreground">
                {doctorData.averageRating?.toFixed(1) ?? "—"}
                {doctorData.averageRating && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / 5
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Appointments
          </h2>
          <Link
            to="/appointments"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        {appointments.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-muted-foreground">No upcoming appointments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <Link
                key={appointment.id}
                to={`/appointments/${appointment.id}`}
                className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-card-foreground">
                      {appointment.patientName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.appointmentDate} at {appointment.startTime}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      appointment.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : appointment.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : appointment.status === "confirmed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {appointment.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/appointments">
            <Button data-testid="btn-view-appointments">
              <Calendar className="mr-2 h-4 w-4" />
              View Appointments
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
