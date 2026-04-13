import { Routes, Route, Navigate } from "react-router";
import { AppLayout } from "@/layouts/app-layout";
import { DashboardPage } from "@/pages/dashboard";
import { LoginPage } from "@/pages/login";
import { RegisterPage } from "@/pages/register";
import { ProfilePage } from "@/pages/profile";
import { DepartmentsPage } from "@/pages/departments";
import { DoctorsPage } from "@/pages/doctors";
import { DoctorProfilePage } from "@/pages/doctor-profile";
import { PatientsPage } from "@/pages/patients";
import { BookAppointmentPage } from "@/pages/book-appointment";
import { AppointmentsPage } from "@/pages/appointments";
import { AppointmentDetailPage } from "@/pages/appointments/detail";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuthStore } from "@/stores/auth-store";

function PatientOnlyRoute() {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== "patient") return <Navigate to="/dashboard" replace />;
  return <BookAppointmentPage />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/doctors/:id" element={<DoctorProfilePage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
          <Route path="/appointments/book" element={<PatientOnlyRoute />} />
          {/* Additional routes will be added per task */}
        </Route>
      </Route>
    </Routes>
  );
}
