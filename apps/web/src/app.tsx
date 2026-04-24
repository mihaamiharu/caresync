import {
  createBrowserRouter,
  Navigate,
  LoaderFunctionArgs,
} from "react-router";
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
import {
  InvoiceListPage,
  InvoiceDetailPage,
  invoicesLoader,
  invoiceDetailLoader,
} from "@/pages/invoices";
import {
  PrescriptionsPage,
  prescriptionsLoader,
} from "@/pages/prescriptions/index";
import {
  PrescriptionDetailPage,
  prescriptionDetailLoader,
} from "@/pages/prescriptions/detail";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { RouteErrorPage } from "@/components/route-error-page";
import { useAuthStore } from "@/stores/auth-store";
import { AdminDashboardPage, adminLoader } from "@/pages/admin";

function PatientOnlyRoute() {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== "patient") return <Navigate to="/dashboard" replace />;
  return <BookAppointmentPage />;
}

function AdminOnlyRoute() {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <AdminDashboardPage />;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
{
        element: <ProtectedRoute />,
        errorElement: <RouteErrorPage />,
        children: [
      {
        path: "/",
        element: <Navigate to="/dashboard" replace />,
      },
      {
        element: <AppLayout />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },
          {
            path: "/profile",
            loader: profileLoader,
            element: <ProfilePage />,
          },
          {
            path: "/departments",
            loader: departmentsLoader,
            element: <DepartmentsPage />,
          },
          {
            path: "/doctors",
            loader: doctorsLoader,
            element: <DoctorsPage />,
          },
          {
            path: "/doctors/:id",
            loader: doctorProfileLoader,
            element: <DoctorProfilePage />,
          },
          {
            path: "/patients",
            loader: patientsLoader,
            element: <PatientsPage />,
          },
          {
            path: "/admin",
            loader: adminLoader,
            element: <AdminOnlyRoute />,
          },
          {
            path: "/appointments",
            loader: appointmentsLoader,
            element: <AppointmentsPage />,
          },
          {
            path: "/appointments/:id",
            loader: appointmentDetailLoader,
            element: <AppointmentDetailPage />,
          },
          {
            path: "/appointments/book",
            loader: bookAppointmentLoader,
            element: <PatientOnlyRoute />,
          },
          {
            path: "/medical-records",
            loader: medicalRecordsLoader,
            element: <MedicalRecordsPage />,
          },
          {
            path: "/medical-records/:id",
            loader: medicalRecordDetailLoader,
            element: <MedicalRecordDetailPage />,
          },
          {
            path: "/invoices",
            loader: invoicesLoader,
            element: <InvoiceListPage />,
          },
          {
            path: "/invoices/:id",
            loader: invoiceDetailLoader,
            element: <InvoiceDetailPage />,
          },
          {
            path: "/prescriptions",
            loader: prescriptionsLoader,
            element: <PrescriptionsPage />,
          },
          {
            path: "/prescriptions/:id",
            loader: prescriptionDetailLoader,
            element: <PrescriptionDetailPage />,
          },
        ],
      },
    ],
  },
]);
