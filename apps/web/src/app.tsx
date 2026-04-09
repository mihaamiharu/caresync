import { Routes, Route } from "react-router";

export function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="text-center" data-testid="landing-page">
              <h1 className="text-4xl font-bold text-gray-900">
                🏥 MediBook
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                Healthcare Clinic Management System
              </p>
              <p className="mt-1 text-sm text-gray-400">
                A practice ground for QA Automation Engineers
              </p>
            </div>
          </div>
        }
      />
    </Routes>
  );
}
