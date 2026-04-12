import { NavLink } from "react-router";
import {
  LayoutDashboard,
  Calendar,
  Stethoscope,
  Users,
  FileText,
  Receipt,
  Bell,
  Settings,
  User,
  HeartPulse,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { authApi } from "@/lib/api-client";
import { useNavigate } from "react-router";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: null },
  { to: "/appointments", label: "Appointments", icon: Calendar, roles: null },
  { to: "/doctors", label: "Doctors", icon: Stethoscope, roles: null },
  { to: "/patients", label: "Patients", icon: Users, roles: ["admin"] },
  {
    to: "/medical-records",
    label: "Medical Records",
    icon: FileText,
    roles: null,
  },
  { to: "/invoices", label: "Invoices", icon: Receipt, roles: null },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: null },
  { to: "/profile", label: "Profile", icon: User, roles: null },
  { to: "/settings", label: "Settings", icon: Settings, roles: null },
];

export function Sidebar() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Ignore API errors on logout
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  };

  return (
    <aside
      className="flex h-screen w-64 flex-col border-r border-border bg-sidebar"
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <HeartPulse className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold text-foreground">CareSync</span>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        data-testid="sidebar-nav"
      >
        <ul className="space-y-1">
          {navItems
            .filter(
              ({ roles }) => !roles || (user?.role && roles.includes(user.role))
            )
            .map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>

      <div className="border-t border-border p-4">
        <button
          onClick={handleLogout}
          data-testid="logout-button"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log out
        </button>
      </div>
    </aside>
  );
}
