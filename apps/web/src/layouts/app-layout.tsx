import { Outlet } from "react-router";
import { Sidebar } from "@/components/sidebar";
import { NotificationBell } from "@/components/notification-bell";

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden" data-testid="app-layout">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-end border-b border-border bg-background px-6">
          <NotificationBell />
        </header>
        <main
          className="flex-1 overflow-y-auto bg-background p-6"
          data-testid="main-content"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
