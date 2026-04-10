import { Outlet } from "react-router";
import { Sidebar } from "@/components/sidebar";

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden" data-testid="app-layout">
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto bg-background p-6"
        data-testid="main-content"
      >
        <Outlet />
      </main>
    </div>
  );
}
