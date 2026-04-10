import { Routes, Route, Navigate } from "react-router";
import { AppLayout } from "@/layouts/app-layout";
import { DashboardPage } from "@/pages/dashboard";
import { LoginPage } from "@/pages/login";
import { RegisterPage } from "@/pages/register";
import { ProtectedRoute } from "@/components/auth/protected-route";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* Additional routes will be added per task */}
        </Route>
      </Route>
    </Routes>
  );
}
