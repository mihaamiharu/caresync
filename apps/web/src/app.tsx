import { Routes, Route, Navigate } from "react-router";
import { AppLayout } from "@/layouts/app-layout";
import { DashboardPage } from "@/pages/dashboard";
import { LoginPage } from "@/pages/login";
import { RegisterPage } from "@/pages/register";
import { ProfilePage, profileLoader } from "@/pages/profile";
import { DepartmentsPage, departmentsLoader } from "@/pages/departments";
import { DoctorsPage, doctorsLoader } from "@/pages/doctors";
import { DoctorProfilePage, doctorProfileLoader } from "@/pages/doctor-profile";
import { PatientsPage, patientsLoader } from "@/pages/patients";
import {
  BookAppointmentPage,
  bookAppointmentLoader,
} from "@/pages/book-appointment";
import { AppointmentsPage, appointmentsLoader } from "@/pages/appointments";
import {
  AppointmentDetailPage,
  appointmentDetailLoader,
} from "@/pages/appointments/detail";
import {
  MedicalRecordsPage,
  medicalRecordsLoader,
} from "@/pages/medical-records/index";
import {
  MedicalRecordDetailPage,
  medicalRecordDetailLoader,
} from "@/pages/medical-records/detail";
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
          <Route
            path="/profile"
            loader={profileLoader}
            element={<ProfilePage />}
          />
          <Route
            path="/departments"
            loader={departmentsLoader}
            element={<DepartmentsPage />}
          />
          <Route
            path="/doctors"
            loader={doctorsLoader}
            element={<DoctorsPage />}
          />
          <Route
            path="/doctors/:id"
            loader={doctorProfileLoader}
            element={<DoctorProfilePage />}
          />
          <Route
            path="/patients"
            loader={patientsLoader}
            element={<PatientsPage />}
          />
          <Route
            path="/appointments"
            loader={appointmentsLoader}
            element={<AppointmentsPage />}
          />
          <Route
            path="/appointments/:id"
            loader={appointmentDetailLoader}
            element={<AppointmentDetailPage />}
          />
          <Route
            path="/appointments/book"
            loader={bookAppointmentLoader}
            element={<PatientOnlyRoute />}
          />
          <Route
            path="/medical-records"
            loader={medicalRecordsLoader}
            element={<MedicalRecordsPage />}
          />
          <Route
            path="/medical-records/:id"
            loader={medicalRecordDetailLoader}
            element={<MedicalRecordDetailPage />}
          />
        </Route>
      </Route>
    </Routes>
  );
}
